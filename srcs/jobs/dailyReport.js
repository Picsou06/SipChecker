const cron = require('node-cron');
const { pool } = require('../db');

const MEDALS = ['🥇', '🥈', '🥉'];

async function getDailyStats() {
	const [[summaryRows], [firstDrinkerRows], [top3Rows], [shameRows]] = await Promise.all([
		pool.execute(`
			SELECT
				COUNT(DISTINCT CASE WHEN type = 'message' THEN user_id END) AS drinkers_count,
				COALESCE(SUM(type = 'message'), 0) AS total_drinks,
				COALESCE(SUM(type = 'reaction'), 0) AS total_reactions
			FROM sip_events
			WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
		`),
		pool.execute(`
			SELECT user_id, MIN(created_at) AS first_time
			FROM sip_events
			WHERE type = 'message'
				AND DATE(created_at) = CURDATE() - INTERVAL 1 DAY
			ORDER BY first_time ASC
			LIMIT 1
		`),
		pool.execute(`
			SELECT
				user_id,
				SUM(type = 'message') AS drinks,
				SUM(type = 'reaction') AS reactions,
				COUNT(*) AS total
			FROM sip_events
			WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
			GROUP BY user_id
			ORDER BY total DESC
			LIMIT 3
		`),
		pool.execute(`
			SELECT DISTINCT user_id
			FROM sip_events
			WHERE DATE(created_at) = CURDATE() - INTERVAL 2 DAY
				AND user_id NOT IN (
					SELECT DISTINCT user_id
					FROM sip_events
					WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
				)
		`),
	]);

	return {
		summary: summaryRows[0],
		firstDrinker: firstDrinkerRows[0] || null,
		top3: top3Rows,
		shame: shameRows,
	};
}

function buildContent({ summary, firstDrinker, top3, shame }) {
	const yesterday = new Date(Date.now() - 864e5).toLocaleDateString('en-US', {
		weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
	});

	const emoji = process.env.SIP_EMOJI || 'beers';
	const separator = Array(12).fill(`:${emoji}:`).join(' ');

	let md = `${separator}\n\n`;
	md += `## 📊 Daily :sip: Report - ${yesterday}\n\n`;

	md += `**Global stats**\n\n`;
	md += `- 👥 **${summary.drinkers_count}** people drank today\n`;
	md += `- 🍺 **${summary.total_drinks}** drinks\n`;
	md += `- 🥂 **${summary.total_reactions}** encouragements\n`;

	if (firstDrinker) {
		const firstTime = new Date(firstDrinker.first_time).toLocaleTimeString('en-US', {
			hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
		});
		md += `- ⏰ First drink at **${firstTime} UTC** by ![](@${firstDrinker.user_id})\n`;
	} else {
		md += `- ⏰ Nobody drank today\n`;
	}

	md += `\n**Top 3**\n\n`;

	if (top3.length === 0) {
		md += `_No drinks recorded today._\n`;
	} else {
		for (let i = 0; i < top3.length; i++) {
			const row = top3[i];
			md += `- ${MEDALS[i]} ![](@${row.user_id}) - **${row.total}** *(${row.drinks} drinks · ${row.reactions} encouragements)*\n`;
		}
	}

	md += `\n**🫣 Hall of shame**\n\n`;

	if (shame.length === 0) {
		md += `_Everyone hydrated yesterday. Impressive._\n`;
	} else {
		md += `_These people forgot to hydrate yesterday:_\n\n`;
		md += shame.map(row => `- ![](@${row.user_id})`).join('\n') + '\n';
	}

	md += `\n${separator}\n`;

	return { type: 'markdown', markdown: md };
}

function registerDailyReport(app) {
	cron.schedule('0 0 * * *', async () => {
		console.log('Running daily sip report...');
		try {
			const stats = await getDailyStats();

			await app.client.canvases.edit({
				canvas_id: process.env.CANEVAS_LOGS,
				changes: [{
					operation: 'insert_at_start',
					document_content: buildContent(stats),
				}],
			});

			console.log('✅ Daily sip report posted to canvas.');
		} catch (err) {
			console.error('❌ Daily report error:', err.message);
		}
	});
}

module.exports = { registerDailyReport };
