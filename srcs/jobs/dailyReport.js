const cron = require('node-cron');
const { pool } = require('../db');

async function getUserPingEnabled(userId) {
	const [rows] = await pool.execute(
		`SELECT enabled FROM user_ping WHERE user_id = ?`,
		[userId]
	);
	return rows.length === 0 ? false : Boolean(rows[0].enabled);
}

async function resolveDisplayName(client, userId) {
	try {
		const res = await client.users.info({ user: userId });
		const p = res.user?.profile;
		return p?.display_name || p?.real_name || res.user?.name || userId;
	} catch {
		return userId;
	}
}

async function formatUser(userId, client) {
	const pingEnabled = await getUserPingEnabled(userId);
	if (pingEnabled) return `![](@${userId})`;
	const name = await resolveDisplayName(client, userId);
	return `@${name}`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

async function getDailyStats(dateStr) {
	const [[summaryRows], [firstDrinkerRows], [top3Rows], [shameRows]] = await Promise.all([
		pool.execute(`
			SELECT
				COUNT(DISTINCT CASE WHEN type = 'message' THEN user_id END) AS drinkers_count,
				COALESCE(SUM(type = 'message'), 0) AS total_drinks,
				COALESCE(SUM(type = 'reaction'), 0) AS total_reactions
			FROM sip_events
			WHERE DATE(created_at) = ?
		`, [dateStr]),
		pool.execute(`
			SELECT user_id, MIN(created_at) AS first_time
			FROM sip_events
			WHERE type = 'message'
				AND DATE(created_at) = ?
			ORDER BY first_time ASC
			LIMIT 1
		`, [dateStr]),
		pool.execute(`
			SELECT
				user_id,
				SUM(type = 'message') AS drinks,
				SUM(type = 'reaction') AS reactions,
				COUNT(*) AS total
			FROM sip_events
			WHERE DATE(created_at) = ?
			GROUP BY user_id
			ORDER BY total DESC
			LIMIT 3
		`, [dateStr]),
		pool.execute(`
			SELECT DISTINCT user_id
			FROM sip_events
			WHERE DATE(created_at) = DATE(?) - INTERVAL 1 DAY
				AND user_id NOT IN (
					SELECT DISTINCT user_id
					FROM sip_events
					WHERE DATE(created_at) = ?
				)
		`, [dateStr, dateStr]),
	]);

	return {
		summary: summaryRows[0],
		firstDrinker: firstDrinkerRows[0] || null,
		top3: top3Rows,
		shame: shameRows,
	};
}

async function buildContent({ summary, firstDrinker, top3, shame }, dateStr, client) {
	const displayDate = new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', {
		weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
	});

	const emoji = process.env.SIP_EMOJI || 'beers';
	const separator = Array(12).fill(`:${emoji}:`).join(' ');

	let md = `${separator}\n\n`;
	md += `## 📊 Daily :sip: Report - ${displayDate}\n\n`;

	md += `**Global stats**\n\n`;
	md += `- 👥 **${summary.drinkers_count}** people drank today\n`;
	md += `- 🍺 **${summary.total_drinks}** drinks\n`;
	md += `- 🥂 **${summary.total_reactions}** encouragements\n`;

	if (firstDrinker) {
		const firstTime = new Date(firstDrinker.first_time).toLocaleTimeString('en-US', {
			hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
		});
		md += `- ⏰ First drink at **${firstTime} UTC** by ${await formatUser(firstDrinker.user_id, client)}\n`;
	} else {
		md += `- ⏰ Nobody drank today\n`;
	}

	md += `\n**Top 3**\n\n`;

	if (top3.length === 0) {
		md += `_No drinks recorded today._\n`;
	} else {
		const top3Lines = await Promise.all(top3.map((row, i) =>
			formatUser(row.user_id, client).then(name =>
				`- ${MEDALS[i]} ${name} - **${row.total}** *(${row.drinks} drinks · ${row.reactions} encouragements)*`
			)
		));
		md += top3Lines.join('\n') + '\n';
	}

	md += `\n**🫣 Hall of shame**\n\n`;

	if (shame.length === 0) {
		md += `_Everyone hydrated yesterday. Impressive._\n`;
	} else {
		md += `_These people forgot to hydrate yesterday:_\n\n`;
		const shameLines = await Promise.all(shame.map(async row => `- ${await formatUser(row.user_id, client)}`));
		md += shameLines.join('\n') + '\n';
	}

	md += `\n💡 _Want to get pinged in the next report? Use \`/sip-notificate true\`_\n`;
	md += `\n${separator}\n`;

	return { type: 'markdown', markdown: md };
}

function registerDailyReport(app) {
	cron.schedule('0 0 * * *', async () => {
		console.log('Running daily sip report...');
		try {
			const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
			const stats = await getDailyStats(yesterday);

			await app.client.canvases.edit({
				canvas_id: process.env.CANEVAS_LOGS,
				changes: [{
					operation: 'insert_at_start',
					document_content: await buildContent(stats, yesterday, app.client),
				}],
			});

			console.log('✅ Daily sip report posted to canvas.');
		} catch (err) {
			console.error('❌ Daily report error:', err.message);
		}
	});
}

module.exports = { registerDailyReport, getDailyStats, buildContent };
