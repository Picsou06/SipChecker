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

async function run() {
	let cursor;
	let totalMessages = 0;
	let totalReactions = 0;
	let pages = 0;
	const threadTimestamps = [];

	console.log(`📥 Récupération de tout l'historique du channel ${CHANNEL}...`);

	do {
		const res = await client.conversations.history({
			channel: CHANNEL,
			limit: 200,
			cursor,
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
