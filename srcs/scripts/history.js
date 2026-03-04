require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { WebClient } = require('@slack/web-api');
const { pool } = require('../db');

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.CHANNEL_SIP_ALERTS;
const SIP_EMOJI = process.env.SIP_EMOJI;

function tsToDatetime(ts) {
	return new Date(parseFloat(ts) * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

async function insertEvent(userId, channelId, type, messageId, createdAt) {
	await pool.execute(
		'INSERT IGNORE INTO sip_events (user_id, channel_id, type, message_id, created_at) VALUES (?, ?, ?, ?, ?)',
		[userId, channelId, type, messageId, createdAt]
	);
}

async function processMessage(msg, totalMessages, totalReactions) {
	if (!msg.user) return { totalMessages, totalReactions };

	const createdAt = tsToDatetime(msg.ts);

	if (msg.text && msg.text.includes(':'+SIP_EMOJI+':')) {
		await insertEvent(msg.user, CHANNEL, 'message', msg.ts, createdAt);
		totalMessages++;
	}

	if (msg.reactions) {
		for (const reaction of msg.reactions) {
			if (reaction.name === SIP_EMOJI) {
				for (const userId of reaction.users) {
					await insertEvent(userId, CHANNEL, 'reaction', msg.ts, createdAt);
					totalReactions++;
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
