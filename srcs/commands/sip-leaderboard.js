const { pool } = require('../db');
const { getUserPrefs } = require('../utils');
const { getT, SUPPORTED_LOCALES } = require('../locales');

function parseForcedLocale(text) {
	const token = (text || '').trim().toLowerCase();
	return SUPPORTED_LOCALES.includes(token) ? token : null;
}

const MEDALS = ['🥇', '🥈', '🥉'];

async function getStreakForDate(userId, dateStr) {
	const [rows] = await pool.execute(
		`SELECT
			MAX(day) AS last_day,
			COUNT(*) AS streak_days
		FROM (
			SELECT
				DATE(created_at) AS day,
				DATE_SUB(DATE(created_at), INTERVAL DENSE_RANK() OVER (ORDER BY DATE(created_at)) DAY) AS grp
			FROM sip_events
			WHERE user_id = ?
				AND DATE(created_at) <= ?
			GROUP BY DATE(created_at)
		) AS streaks
		GROUP BY grp
		ORDER BY last_day DESC
		LIMIT 1`,
		[userId, dateStr]
	);

	return Number(rows[0]?.streak_days || 0);
}

async function getCurrentStreak(userId) {
	const [rows] = await pool.execute(
		`SELECT
			MAX(day) AS last_day,
			COUNT(*) AS streak_days,
			MAX(day) = CURDATE() AS is_today
		FROM (
			SELECT
				DATE(created_at) AS day,
				DATE_SUB(DATE(created_at), INTERVAL DENSE_RANK() OVER (ORDER BY DATE(created_at)) DAY) AS grp
			FROM sip_events
			WHERE user_id = ?
			GROUP BY DATE(created_at)
		) AS streaks
		GROUP BY grp
		ORDER BY last_day DESC
		LIMIT 1`,
		[userId]
	);

	const row = rows[0] || {};
	return {
		current: Number(row.streak_days || 0),
		isToday: Boolean(row.is_today),
	};
}

async function getStats(todayOnly) {
	const where = todayOnly ? 'WHERE DATE(created_at) = CURDATE()' : '';

	const [[totalsRows], [top3Rows]] = await Promise.all([
		pool.execute(`
			SELECT
				CAST(COALESCE(SUM(type = 'message'), 0) - COALESCE(SUM(type = 'message_unsip'), 0) AS SIGNED) AS total_messages,
				CAST(COALESCE(SUM(type = 'reaction'), 0) - COALESCE(SUM(type = 'reaction_unsip'), 0) AS SIGNED) AS total_reactions
			FROM sip_events ${where}
		`),
		pool.execute(`
			SELECT
				user_id,
				CAST(SUM(type = 'message') - SUM(type = 'message_unsip') AS SIGNED) AS msg_count,
				CAST(SUM(type = 'reaction') - SUM(type = 'reaction_unsip') AS SIGNED) AS react_count,
				CAST(SUM(type IN ('message', 'reaction')) - SUM(type IN ('message_unsip', 'reaction_unsip')) AS SIGNED) AS total
			FROM sip_events ${where}
			GROUP BY user_id
			ORDER BY total DESC
			LIMIT 3
		`),
	]);

	return { totals: totalsRows[0], top3: top3Rows };
}

async function buildModal(titleKey, { totals, top3 }, locale, dateStr) {
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
		const top3Lines = await Promise.all(top3.map(async (row, i) => {
			const currentStreak = await getCurrentStreak(row.user_id);
			const streakEmoji = currentStreak.isToday ? '🔥' : '⚪';
			const streakLabel = `${streakEmoji} ${currentStreak.current}`;
			return {
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: lb.topEntry(
						MEDALS[i],
						`<@${row.user_id}>`,
						row.total,
						row.msg_count,
						row.react_count,
						streakLabel
					),
				},
			};
		}));
		blocks.push(...top3Lines);
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
	const forcedLocale = parseForcedLocale(command.text);
	const [{ locale }, stats] = await Promise.all([
		getUserPrefs(client, command.user_id),
		getStats(true),
	]);
	const dateStr = new Date().toISOString().slice(0, 10);
	await client.views.open({
		trigger_id: command.trigger_id,
		view: await buildModal('titleDay', stats, forcedLocale || locale, dateStr),
	});
}

async function handleSipStats({ ack, client, command }) {
	await ack();
	const forcedLocale = parseForcedLocale(command.text);
	const [{ locale }, stats] = await Promise.all([
		getUserPrefs(client, command.user_id),
		getStats(false),
	]);
	const dateStr = new Date().toISOString().slice(0, 10);
	await client.views.open({
		trigger_id: command.trigger_id,
		view: await buildModal('titleStats', stats, forcedLocale || locale, dateStr),
	});
}

module.exports = { handleSipDay, handleSipStats };
