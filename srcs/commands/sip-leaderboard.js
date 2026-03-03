const { pool } = require('../db');
const { getUserPrefs } = require('../utils');
const { getT } = require('../locales');

const MEDALS = ['🥇', '🥈', '🥉'];

async function getStats(todayOnly) {
	const where = todayOnly ? 'WHERE DATE(created_at) = CURDATE()' : '';

	const [[totalsRows], [top3Rows]] = await Promise.all([
		pool.execute(`
			SELECT
				COALESCE(SUM(type = 'message'), 0) AS total_messages,
				COALESCE(SUM(type = 'reaction'), 0) AS total_reactions
			FROM sip_events ${where}
		`),
		pool.execute(`
			SELECT
				user_id,
				SUM(type = 'message') AS msg_count,
				SUM(type = 'reaction') AS react_count,
				COUNT(*) AS total
			FROM sip_events ${where}
			GROUP BY user_id
			ORDER BY total DESC
			LIMIT 3
		`),
	]);

	return { totals: totalsRows[0], top3: top3Rows };
}

function buildModal(titleKey, { totals, top3 }, locale) {
	const t = getT(locale);
	const lb = t.leaderboard;
	const blocks = [];

	blocks.push({
		type: 'section',
		fields: [
			{ type: 'mrkdwn', text: `${lb.labelMessages}\n${totals.total_messages}` },
			{ type: 'mrkdwn', text: `${lb.labelReactions}\n${totals.total_reactions}` },
		],
	});

	blocks.push({ type: 'divider' });

	blocks.push({
		type: 'section',
		text: { type: 'mrkdwn', text: lb.top3Header },
	});

	if (top3.length === 0) {
		blocks.push({
			type: 'section',
			text: { type: 'mrkdwn', text: lb.noSips },
		});
	} else {
		for (let i = 0; i < top3.length; i++) {
			const row = top3[i];
			blocks.push({
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: lb.topEntry(MEDALS[i], `<@${row.user_id}>`, row.total, row.msg_count, row.react_count),
				},
			});
		}
	}

	return {
		type: 'modal',
		title: { type: 'plain_text', text: lb[titleKey], emoji: true },
		close: { type: 'plain_text', text: t.close, emoji: true },
		blocks,
	};
}

async function handleSipDay({ ack, client, command }) {
	await ack();
	const [{ locale }, stats] = await Promise.all([
		getUserPrefs(client, command.user_id),
		getStats(true),
	]);
	await client.views.open({
		trigger_id: command.trigger_id,
		view: buildModal('titleDay', stats, locale),
	});
}

async function handleSipStats({ ack, client, command }) {
	await ack();
	const [{ locale }, stats] = await Promise.all([
		getUserPrefs(client, command.user_id),
		getStats(false),
	]);
	await client.views.open({
		trigger_id: command.trigger_id,
		view: buildModal('titleStats', stats, locale),
	});
}

module.exports = { handleSipDay, handleSipStats };
