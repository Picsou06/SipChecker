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

// ping : vraie mention Slack (notifie la personne) si elle l'a activée ; false pour les anciens rapports
// réécrits à chaque régénération du canvas, qui ne doivent notifier personne.
// cache : Map partagée pendant une génération, pour ne pas rappeler users.info pour chaque jour.
async function formatUser(userId, client, { ping = true, cache } = {}) {
	if (ping && await getUserPingEnabled(userId)) return `![](@${userId})`;
	if (cache?.has(userId)) return cache.get(userId);
	const name = `@${await resolveDisplayName(client, userId)}`;
	cache?.set(userId, name);
	return name;
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

async function getDailyStats(dateStr) {
	const [[summaryRows], [firstDrinkerRows], [top3Rows], [shameRows]] = await Promise.all([
		pool.execute(`
			SELECT
				COUNT(DISTINCT CASE WHEN type = 'message' THEN user_id END) AS drinkers_count,
				CAST(COALESCE(SUM(type = 'message'), 0) - COALESCE(SUM(type = 'message_unsip'), 0) AS SIGNED) AS total_drinks,
				CAST(COALESCE(SUM(type = 'reaction'), 0) - COALESCE(SUM(type = 'reaction_unsip'), 0) AS SIGNED) AS total_reactions
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
				CAST(SUM(type = 'message') - SUM(type = 'message_unsip') AS SIGNED) AS drinks,
				CAST(SUM(type = 'reaction') - SUM(type = 'reaction_unsip') AS SIGNED) AS reactions,
				CAST(SUM(type IN ('message', 'reaction')) - SUM(type IN ('message_unsip', 'reaction_unsip')) AS SIGNED) AS total
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

async function buildContent({ summary, firstDrinker, top3, shame }, dateStr, client, userOpts = {}) {
	const displayDate = new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', {
		weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
	});

	const emoji = (process.env.SIP_EMOJI || 'beers').split(',')[0].trim();
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
		const firstName = await formatUser(firstDrinker.user_id, client, userOpts);
		const firstStreak = await getStreakForDate(firstDrinker.user_id, dateStr);
		md += `- ⏰ First drink at **${firstTime} UTC** by ${firstName} (🔥 ${firstStreak})\n`;
	} else {
		md += `- ⏰ Nobody drank today\n`;
	}

	md += `\n**Top 3**\n\n`;

	if (top3.length === 0) {
		md += `_No drinks recorded today._\n`;
	} else {
		const top3Lines = await Promise.all(top3.map(async (row, i) => {
			const name = await formatUser(row.user_id, client, userOpts);
			const streak = await getStreakForDate(row.user_id, dateStr);
			return `- ${MEDALS[i]} ${name} - **${row.total}** *(${row.drinks} drinks · ${row.reactions} encouragements)* · 🔥 ${streak}`;
		}));
		md += top3Lines.join('\n') + '\n';
	}

	md += `\n**🫣 Hall of shame**\n\n`;

	if (shame.length === 0) {
		md += `_Everyone hydrated yesterday. Impressive._\n`;
	} else {
		md += `_These people forgot to hydrate yesterday:_\n\n`;
		const shameDate = new Date(`${dateStr}T00:00:00Z`);
		shameDate.setUTCDate(shameDate.getUTCDate() - 1);
		const shameDateStr = shameDate.toISOString().slice(0, 10);
		const shameUsers = await Promise.all(shame.map(async row => {
			const name = await formatUser(row.user_id, client, userOpts);
			const lostStreak = await getStreakForDate(row.user_id, shameDateStr);
			return { name, lostStreak };
		}));
		shameUsers.sort((a, b) => b.lostStreak - a.lostStreak);
		const shameLines = shameUsers.map(user => `- ${user.name} · 💔 ${user.lostStreak}`);
		md += shameLines.join('\n') + '\n';
	}

	md += `\n💡 _Want to get pinged in the next report? Use \`/sip-notificate true\`_\n`;
	md += `\n${separator}\n`;

	return { type: 'markdown', markdown: md };
}

// ─── Canvas : régénéré en entier à chaque rapport ───────────────────────────
// Slack refuse un canvas trop gros (canvas_too_large) : on écrit les rapports des jours consécutifs,
// du plus récent au plus ancien, tant que la taille reste sous CANVAS_MAX_BYTES. Les jours manquants
// sont ainsi recréés depuis la base et les plus anciens disparaissent du canvas (pas de la base).
// Les jours ne font pas tous la même taille : le nombre de jours gardés varie.
const CANVAS_MAX_BYTES = Number(process.env.CANVAS_MAX_BYTES) || 150_000; // 165 rapports (~165 Ko) tenaient, le 166e a été refusé
const MAX_ATTEMPTS = 8;

function previousDay(dateStr) {
	const d = new Date(`${dateStr}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - 1);
	return d.toISOString().slice(0, 10);
}

async function getFirstEventDate() {
	const [[row]] = await pool.execute(`SELECT DATE_FORMAT(MIN(created_at), '%Y-%m-%d') AS first_day FROM sip_events`);
	return row.first_day;
}

// Rapports de lastDateStr en remontant, dans la limite de maxBytes (le rapport le plus récent est toujours inclus).
async function buildCanvasReports(client, lastDateStr, maxBytes = CANVAS_MAX_BYTES) {
	const firstDay = await getFirstEventDate();
	const cache = new Map();
	const reports = [];
	let bytes = 0;
	for (let dateStr = lastDateStr; firstDay && dateStr >= firstDay; dateStr = previousDay(dateStr)) {
		const { markdown } = await buildContent(await getDailyStats(dateStr), dateStr, client, { ping: reports.length === 0, cache });
		const size = Buffer.byteLength(markdown);
		if (reports.length > 0 && bytes + size > maxBytes) break;
		reports.push({ dateStr, markdown, size });
		bytes += size;
	}
	return reports;
}

// Remplace tout le contenu du canvas. Si Slack le trouve encore trop gros, retire 10 % des jours les plus anciens et réessaie.
async function writeCanvas(client, reports) {
	let count = reports.length;
	for (let attempt = 1; ; attempt++) {
		const kept = reports.slice(0, count);
		try {
			await client.canvases.edit({
				canvas_id: process.env.CANEVAS_LOGS,
				changes: [{ operation: 'replace', document_content: { type: 'markdown', markdown: kept.map(r => r.markdown).join('\n') } }],
			});
			return kept;
		} catch (err) {
			if (err.data?.error !== 'canvas_too_large' || count <= 1 || attempt >= MAX_ATTEMPTS) throw err;
			count = Math.max(1, Math.floor(count * 0.9));
			console.warn(`⚠️ Canvas encore trop gros, nouvel essai avec ${count} jours`);
		}
	}
}

async function refreshCanvas(client, lastDateStr) {
	const reports = await buildCanvasReports(client, lastDateStr);
	const kept = await writeCanvas(client, reports);
	const bytes = kept.reduce((n, r) => n + r.size, 0);
	return { days: kept.length, from: kept[kept.length - 1].dateStr, to: kept[0].dateStr, bytes };
}

function registerDailyReport(app) {
	cron.schedule('0 0 * * *', async () => {
		console.log('Running daily sip report...');
		try {
			const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
			const r = await refreshCanvas(app.client, yesterday);
			console.log(`✅ Daily sip report posted to canvas (${r.days} jours, du ${r.from} au ${r.to}, ${r.bytes} octets).`);
		} catch (err) {
			console.error('❌ Daily report error:', err.data?.error || err.message);
		}
	});
}

module.exports = { registerDailyReport, getDailyStats, buildContent, buildCanvasReports, refreshCanvas, CANVAS_MAX_BYTES };
