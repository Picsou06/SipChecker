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

async function run() {
	let cursor;
	let totalMessages = 0;
	let totalReactions = 0;
	let pages = 0;

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
			if (!msg.user) continue;

			const createdAt = tsToDatetime(msg.ts);

			if (msg.text && msg.text.includes(SIP_EMOJI)) {
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
		}

		console.log(` ✓`);
		cursor = res.response_metadata?.next_cursor;
	} while (cursor);

	console.log(`\n✅ Import terminé : ${totalMessages} messages, ${totalReactions} réactions insérés.`);
	await pool.end();
}

run().catch(err => {
	console.error('❌ Erreur:', err.message);
	process.exit(1);
});
