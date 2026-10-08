require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { WebClient } = require('@slack/web-api');
const { pool } = require('../db');

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.CHANNEL_SIP_ALERTS;
const SIP_EMOJIS = (process.env.SIP_EMOJI || '').split(',').map(e => e.trim()).filter(Boolean);
const UNSIP_EMOJIS = (process.env.UNSIP_EMOJI || '').split(',').map(e => e.trim()).filter(Boolean);

function tsToDatetime(ts) {
	return new Date(parseFloat(ts) * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

async function insertEvent(userId, channelId, type, emoji, messageId, createdAt) {
	await pool.execute(
		'INSERT IGNORE INTO sip_events (user_id, channel_id, type, emoji, message_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
		[userId, channelId, type, emoji || 'sip', messageId, createdAt]
	);
}

async function processMessage(msg, totalMessages, totalReactions) {
	if (!msg.user) return { totalMessages, totalReactions };

	const createdAt = tsToDatetime(msg.ts);

	const sipEmoji = msg.text && SIP_EMOJIS.find(e => msg.text.includes(':'+e+':'));
	if (sipEmoji) {
		await insertEvent(msg.user, CHANNEL, 'message', sipEmoji, msg.ts, createdAt);
		totalMessages++;
	}
	const unsipEmoji = msg.text && UNSIP_EMOJIS.find(e => msg.text.includes(':'+e+':'));
	if (unsipEmoji) {
		await insertEvent(msg.user, CHANNEL, 'message_unsip', unsipEmoji, msg.ts, createdAt);
		totalMessages--;
	}

	if (msg.reactions) {
		for (const reaction of msg.reactions) {
			if (SIP_EMOJIS.includes(reaction.name)) {
				for (const userId of reaction.users) {
					await insertEvent(userId, CHANNEL, 'reaction', reaction.name, msg.ts, createdAt);
					totalReactions++;
				}
			}
			if (UNSIP_EMOJIS.includes(reaction.name)) {
				for (const userId of reaction.users) {
					await insertEvent(userId, CHANNEL, 'reaction_unsip', reaction.name, msg.ts, createdAt);
					totalReactions--;
				}
			}
		}
	}

	return { totalMessages, totalReactions };
}

// ─── Arguments CLI ───────────────────────────────────────────────────────────

function parseArgs(argv) {
	const args = argv.slice(2);

	if (args[0] === 'up') return { mode: 'up' };

	const idx = args.findIndex(a => a === '--days' || a === '-d' || a.startsWith('--days='));
	if (idx !== -1) {
		const raw = args[idx].includes('=') ? args[idx].split('=')[1] : args[idx + 1];
		const days = parseInt(raw, 10);
		if (!Number.isFinite(days) || days <= 0) {
			throw new Error(`Valeur de --days invalide : "${raw}"`);
		}
		return { mode: 'days', days };
	}

	return { mode: 'full' };
}

// Dernier message_id (ts Slack) déjà connu en base, tous types confondus
async function getLastSavedTs() {
	const [rows] = await pool.execute(
		"SELECT message_id FROM sip_events WHERE message_id != '' ORDER BY message_id DESC LIMIT 1"
	);
	return rows[0]?.message_id || null;
}

// Détermine le ts `oldest` à partir duquel démarrer la récupération (undefined = historique complet)
async function resolveOldest(opts) {
	if (opts.mode === 'days') {
		const oldest = (Date.now() / 1000 - opts.days * 86400).toFixed(6);
		console.log(`📅 Récupération des sips des ${opts.days} derniers jours (depuis le ${tsToDatetime(oldest)})...`);
		return oldest;
	}

	if (opts.mode === 'up') {
		const lastTs = await getLastSavedTs();
		if (!lastTs) {
			console.log('ℹ️  Aucun sip en base, bascule sur une récupération complète.');
			return undefined;
		}
		console.log(`🔄 Mode incrémental : récupération depuis le dernier sip enregistré (${tsToDatetime(lastTs)})...`);
		return lastTs;
	}

	return undefined;
}

// ─── Récupération ────────────────────────────────────────────────────────────

async function run() {
	const opts = parseArgs(process.argv);
	const oldest = await resolveOldest(opts);

	let cursor;
	let totalMessages = 0;
	let totalReactions = 0;
	let pages = 0;
	const threadTimestamps = [];

	console.log(`📥 Récupération de ${oldest ? "l'historique récent" : "tout l'historique"} du channel ${CHANNEL}...`);

	do {
		const res = await client.conversations.history({
			channel: CHANNEL,
			limit: 200,
			cursor,
			...(oldest ? { oldest } : {}),
		});

		pages++;
		process.stdout.write(`   Page ${pages} — ${res.messages.length} messages...`);

		for (const msg of res.messages) {
			({ totalMessages, totalReactions } = await processMessage(msg, totalMessages, totalReactions));
			if (msg.reply_count > 0) threadTimestamps.push(msg.ts);
		}

		console.log(` ✓`);
		cursor = res.response_metadata?.next_cursor;
	} while (cursor);

	console.log(`\n📥 Récupération des threads (${threadTimestamps.length} threads)...`);

	for (let i = 0; i < threadTimestamps.length; i++) {
		const threadTs = threadTimestamps[i];
		process.stdout.write(`   Thread ${i + 1}/${threadTimestamps.length}...`);

		let replyCursor;
		do {
			const res = await client.conversations.replies({
				channel: CHANNEL,
				ts: threadTs,
				limit: 200,
				cursor: replyCursor,
			});

			const replies = res.messages.slice(1);
			for (const msg of replies) {
				({ totalMessages, totalReactions } = await processMessage(msg, totalMessages, totalReactions));
			}

			replyCursor = res.response_metadata?.next_cursor;
		} while (replyCursor);

		console.log(` ✓`);
	}

	console.log(`\n✅ Import terminé : ${totalMessages} messages, ${totalReactions} réactions insérés.`);
	await pool.end();
}

run().catch(err => {
	console.error('❌ Erreur:', err.message);
	process.exit(1);
});
