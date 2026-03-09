require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const readline = require('readline');
const { WebClient } = require('@slack/web-api');
const { pool } = require('../db');
const { getDailyStats, buildContent } = require('../jobs/dailyReport');

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

function hr(char = '─', len = 60) { return char.repeat(len); }
function section(title) { console.log(`\n${hr()}\n  ${title}\n${hr()}`); }
function field(label, value) {
	const v = value === null || value === undefined ? '(none)' : String(value);
	console.log(`  ${label.padEnd(26)} ${v}`);
}

function renderUserProfile(u, extended = false) {
	const p = u.profile;
	field('Username', u.name);
	field('Display name', p.display_name || p.real_name);
	field('Real name', p.real_name);
	field('Email', p.email);
	if (extended) field('Title', p.title);
	if (extended) field('Phone', p.phone);
	field('Timezone', u.tz);
	field('Locale', u.locale);
	field('Is admin', u.is_admin);
	if (extended) field('Is owner', u.is_owner);
	field('Is bot', u.is_bot);
	field('Deleted', u.deleted);
	field('Status', `${p.status_emoji || ''} ${p.status_text || ''}`.trim() || '(none)');
}

function renderTopRows(rows, title) {
	if (!rows.length) return;
	console.log(`\n  ── ${title}`);
	rows.forEach((r, i) => {
		console.log(`  ${String(i + 1).padStart(2)}. ${r.user_id.padEnd(14)} ${String(r.total).padStart(5)} total  (${r.messages} msg · ${r.reactions} react)`);
	});
}

// ─── Option 1 : Profile utilisateur ────────────────────────────────────────

async function profileUser() {
	const userId = (await ask('  Slack User ID: ')).trim();
	if (!userId) { console.log('  ⚠️  Aucun ID fourni.'); return; }

	section('👤 Profile utilisateur');

	const [userRes, [todayRows], [globalRows]] = await Promise.all([
		client.users.info({ user: userId, include_locale: true }),
		pool.execute(`
			SELECT
				SUM(type = 'message') AS sip_count,
				SUM(type = 'reaction') AS reaction_count,
				MIN(CASE WHEN type = 'message' THEN created_at END) AS first_sip
			FROM sip_events
			WHERE user_id = ? AND DATE(created_at) = CURDATE()
		`, [userId]),
		pool.execute(`
			SELECT
				SUM(type = 'message') AS sip_count,
				SUM(type = 'reaction') AS reaction_count,
				COUNT(*) AS total_events,
				MIN(created_at) AS first_ever,
				MAX(created_at) AS last_ever
			FROM sip_events
			WHERE user_id = ?
		`, [userId]),
	]);

	const u = userRes.user;

	console.log('\n  ── Slack');
	field('ID', u.id);
	renderUserProfile(u, true);

	const today = todayRows[0];
	console.log('\n  ── Stats aujourd\'hui');
	field('Messages (sip)', today?.sip_count ?? 0);
	field('Reactions', today?.reaction_count ?? 0);
	field('Total', Number(today?.sip_count ?? 0) + Number(today?.reaction_count ?? 0));
	field('Premier sip', today?.first_sip ? new Date(today.first_sip).toISOString() : 'Pas encore');

	const global = globalRows[0];
	console.log('\n  ── Stats globales');
	field('Messages (sip)', global?.sip_count ?? 0);
	field('Reactions', global?.reaction_count ?? 0);
	field('Total événements', global?.total_events ?? 0);
	field('Premier sip ever', global?.first_ever ? new Date(global.first_ever).toISOString() : 'Jamais');
	field('Dernier sip ever', global?.last_ever ? new Date(global.last_ever).toISOString() : 'Jamais');
}

// ─── Option 2 : Envoyer le compte rendu ─────────────────────────────────────

function parseFlexibleDate(input) {
	const now = new Date();
	const yyyy = now.getUTCFullYear();
	const mm = String(now.getUTCMonth() + 1).padStart(2, '0');

	let resolved;
	if (!input) {
		// Entrée vide → hier
		const y = new Date(Date.now() - 864e5);
		resolved = y.toISOString().slice(0, 10);
	} else if (/^\d{1,2}$/.test(input)) {
		// "8" ou "08" → jour du mois courant
		resolved = `${yyyy}-${mm}-${input.padStart(2, '0')}`;
	} else if (/^\d{1,2}[/-]\d{1,2}$/.test(input)) {
		// "03-08" ou "3/8" → mois-jour de l'année courante
		const [a, b] = input.split(/[/-]/);
		resolved = `${yyyy}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
	} else {
		resolved = input;
	}

	const d = new Date(resolved + 'T00:00:00Z');
	if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved) || isNaN(d.getTime())) return null;
	return resolved;
}

async function sendReport() {
	const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
	const raw = (await ask(`  Date (YYYY-MM-DD, MM-DD, DD ou Entrée pour ${yesterday}) : `)).trim();
	const dateStr = parseFlexibleDate(raw);
	if (!dateStr) {
		console.log('  ⚠️  Date invalide.');
		return;
	}

	section('📊 Aperçu du compte rendu');
	console.log(`  Génération du rapport pour le ${dateStr}...\n`);

	const stats = await getDailyStats(dateStr);
	const content = await buildContent(stats, dateStr, client);

	console.log(content.markdown);

	console.log(hr());
	const confirm = (await ask('  Envoyer ce rapport dans le canvas ? (o/n) : ')).trim().toLowerCase();
	if (confirm !== 'o') {
		console.log('  Annulé.');
		return;
	}

	await client.canvases.edit({
		canvas_id: process.env.CANEVAS_LOGS,
		changes: [{ operation: 'insert_at_start', document_content: content }],
	});

	console.log(`  ✅ Compte rendu du ${dateStr} envoyé dans le canvas.`);
}

// ─── Option 3 : Sip information ─────────────────────────────────────────────

async function sipInfo() {
	const idStr = (await ask('  Sip ID (base de données) : ')).trim();
	const sipId = parseInt(idStr, 10);
	if (isNaN(sipId) || sipId < 1) { console.log('  ⚠️  ID invalide.'); return; }

	const [rows] = await pool.execute('SELECT * FROM sip_events WHERE id = ?', [sipId]);
	if (rows.length === 0) { console.log('  ❌ Aucun sip trouvé avec cet ID.'); return; }

	const sip = rows[0];

	section('🍺 Sip Information');

	console.log('\n  ── Base de données');
	field('ID', sip.id);
	field('Type', sip.type);
	field('User ID', sip.user_id);
	field('Channel ID', sip.channel_id);
	field('Message ID (ts)', sip.message_id);
	field('Créé le', sip.created_at instanceof Date ? sip.created_at.toISOString() : sip.created_at);

	const [userRes, channelRes, teamRes] = await Promise.allSettled([
		client.users.info({ user: sip.user_id, include_locale: true }),
		client.conversations.info({ channel: sip.channel_id }),
		client.team.info(),
	]);

	// Utilisateur
	console.log('\n  ── Utilisateur');
	if (userRes.status === 'fulfilled') {
		renderUserProfile(userRes.value.user);
	} else {
		console.log(`  ⚠️  ${userRes.reason.message}`);
	}

	// Channel
	console.log('\n  ── Channel');
	if (channelRes.status === 'fulfilled') {
		const c = channelRes.value.channel;
		field('Nom', c.name);
		field('Topic', c.topic?.value);
		field('Purpose', c.purpose?.value);
		field('Is private', c.is_private);
		field('Is archived', c.is_archived);
		field('Membres', c.num_members);
		field('Créé le', c.created ? new Date(c.created * 1000).toISOString() : null);
	} else {
		console.log(`  ⚠️  ${channelRes.reason.message}`);
	}

	// Message
	if (sip.message_id) {
		console.log('\n  ── Message');
		try {
			const histRes = await client.conversations.history({
				channel: sip.channel_id,
				latest: sip.message_id,
				inclusive: true,
				limit: 1,
			});
			const msg = histRes.messages?.[0];
			if (msg && msg.ts === sip.message_id) {
				field('Timestamp (ts)', msg.ts);
				field('Date', new Date(parseFloat(msg.ts) * 1000).toISOString());
				const text = msg.text || '';
				field('Texte', text.length > 120 ? text.slice(0, 120) + '…' : text || '(vide)');
				field('Reactions', msg.reactions?.map(r => `:${r.name}: x${r.count}`).join(', ') || '(aucune)');
				field('Reply count', msg.reply_count ?? 0);
				field('Subtype', msg.subtype ?? '(none)');
			} else {
				console.log('  ⚠️  Message introuvable (peut-être supprimé).');
			}
		} catch (e) {
			console.log(`  ⚠️  ${e.message}`);
		}
	}

	// Workspace
	console.log('\n  ── Workspace');
	if (teamRes.status === 'fulfilled') {
		const t = teamRes.value.team;
		field('Nom', t.name);
		field('Domain', t.domain);
		field('Email domain', t.email_domain);
		field('Plan', t.plan || '(free)');
	} else {
		console.log(`  ⚠️  ${teamRes.reason.message}`);
	}
}

// ─── Option 4 : Statistiques globales ────────────────────────────────────────

async function globalStats() {
	section('📈 Statistiques globales');

	const [
		[usersRows],
		[newUsersRows],
		[totalsRows],
		[todayRows],
		[top10AllTimeRows],
		[top10TodayRows],
		[dailyAvgRows],
		[mostActiveHourRows],
		[mostActiveDayRows],
		[channelRows],
		[streakRows],
		[retentionRows],
	] = await Promise.all([
		// Nombre total d'utilisateurs uniques ayant déjà sippé
		pool.execute(`
			SELECT COUNT(DISTINCT user_id) AS total
			FROM sip_events
		`),
		// Nouveaux utilisateurs : premier sip il y a moins d'1 mois
		pool.execute(`
			SELECT COUNT(*) AS total
			FROM (
				SELECT user_id, MIN(created_at) AS first_sip
				FROM sip_events
				GROUP BY user_id
				HAVING first_sip >= NOW() - INTERVAL 1 MONTH
			) AS new_users
		`),
		// Totaux globaux
		pool.execute(`
			SELECT
				COUNT(*) AS total_events,
				SUM(type = 'message') AS total_messages,
				SUM(type = 'reaction') AS total_reactions
			FROM sip_events
		`),
		// Stats du jour
		pool.execute(`
			SELECT
				COUNT(DISTINCT user_id) AS drinkers,
				SUM(type = 'message') AS messages,
				SUM(type = 'reaction') AS reactions
			FROM sip_events
			WHERE DATE(created_at) = CURDATE()
		`),
		// Top 10 all-time
		pool.execute(`
			SELECT user_id, COUNT(*) AS total,
				SUM(type = 'message') AS messages,
				SUM(type = 'reaction') AS reactions
			FROM sip_events
			GROUP BY user_id
			ORDER BY total DESC
			LIMIT 10
		`),
		// Top 10 aujourd'hui
		pool.execute(`
			SELECT user_id, COUNT(*) AS total,
				SUM(type = 'message') AS messages,
				SUM(type = 'reaction') AS reactions
			FROM sip_events
			WHERE DATE(created_at) = CURDATE()
			GROUP BY user_id
			ORDER BY total DESC
			LIMIT 10
		`),
		// Moyenne de sips par jour (sur les 30 derniers jours)
		pool.execute(`
			SELECT
				ROUND(AVG(daily_total), 1) AS avg_per_day,
				MAX(daily_total) AS max_per_day,
				MIN(daily_total) AS min_per_day
			FROM (
				SELECT DATE(created_at) AS day, COUNT(*) AS daily_total
				FROM sip_events
				WHERE created_at >= NOW() - INTERVAL 30 DAY
				GROUP BY day
			) AS daily
		`),
		// Heure la plus active (UTC)
		pool.execute(`
			SELECT HOUR(created_at) AS hour, COUNT(*) AS total
			FROM sip_events
			GROUP BY hour
			ORDER BY total DESC
			LIMIT 1
		`),
		// Jour de la semaine le plus actif
		pool.execute(`
			SELECT DAYNAME(created_at) AS day_name, COUNT(*) AS total
			FROM sip_events
			GROUP BY DAYOFWEEK(created_at), day_name
			ORDER BY total DESC
			LIMIT 1
		`),
		// Top 5 channels
		pool.execute(`
			SELECT channel_id, COUNT(*) AS total
			FROM sip_events
			GROUP BY channel_id
			ORDER BY total DESC
			LIMIT 5
		`),
		// Utilisateur avec le plus de jours consécutifs actifs
		pool.execute(`
			SELECT user_id, COUNT(*) AS streak_days
			FROM (
				SELECT user_id, DATE(created_at) AS day,
					DATE_SUB(DATE(created_at), INTERVAL DENSE_RANK() OVER (PARTITION BY user_id ORDER BY DATE(created_at)) DAY) AS grp
				FROM sip_events
				GROUP BY user_id, DATE(created_at)
			) AS streaks
			GROUP BY user_id, grp
			ORDER BY streak_days DESC
			LIMIT 1
		`),
		// Taux de rétention : utilisateurs actifs ce mois vs mois dernier
		pool.execute(`
			SELECT
				COUNT(DISTINCT CASE WHEN DATE(created_at) >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN user_id END) AS this_month,
				COUNT(DISTINCT CASE WHEN DATE(created_at) >= DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-01')
					AND DATE(created_at) < DATE_FORMAT(NOW(), '%Y-%m-01') THEN user_id END) AS last_month
			FROM sip_events
		`),
	]);

	const t = totalsRows[0];
	const td = todayRows[0];
	const avg = dailyAvgRows[0];
	const mah = mostActiveHourRows[0];
	const mad = mostActiveDayRows[0];
	const ret = retentionRows[0];

	console.log('\n  ── Utilisateurs');
	field('Total utilisateurs uniques', usersRows[0]?.total ?? 0);
	field('Nouveaux (≤ 1 mois)', newUsersRows[0]?.total ?? 0);
	field('Actifs ce mois', ret?.this_month ?? 0);
	field('Actifs mois dernier', ret?.last_month ?? 0);

	console.log('\n  ── Événements totaux');
	field('Total événements', t?.total_events ?? 0);
	field('Messages sip', t?.total_messages ?? 0);
	field('Reactions', t?.total_reactions ?? 0);
	const ratio = t?.total_messages > 0
		? (Number(t.total_reactions) / Number(t.total_messages)).toFixed(2)
		: '0.00';
	field('Ratio reaction/message', ratio);

	console.log('\n  ── Aujourd\'hui');
	field('Buveurs actifs', td?.drinkers ?? 0);
	field('Messages sip', td?.messages ?? 0);
	field('Reactions', td?.reactions ?? 0);

	console.log('\n  ── Tendances (30 derniers jours)');
	field('Moy. événements/jour', avg?.avg_per_day ?? 0);
	field('Max événements/jour', avg?.max_per_day ?? 0);
	field('Min événements/jour', avg?.min_per_day ?? 0);
	field('Heure la plus active', mah ? `${String(mah.hour).padStart(2, '0')}h UTC (${mah.total} événements)` : '(none)');
	field('Jour le plus actif', mad ? `${mad.day_name} (${mad.total} événements)` : '(none)');

	if (streakRows[0]) {
		const s = streakRows[0];
		console.log('\n  ── Records');
		field('Plus longue série (jours)', `${s.streak_days} jours — ${s.user_id}`);
	}

	renderTopRows(top10AllTimeRows, 'Top 10 all-time');
	renderTopRows(top10TodayRows, "Top 10 aujourd'hui");

	if (channelRows.length > 0) {
		console.log('\n  ── Top 5 channels');
		for (const r of channelRows) {
			console.log(`      ${r.channel_id.padEnd(14)} ${r.total} événements`);
		}
	}
}

// ─── Menu principal ──────────────────────────────────────────────────────────

async function mainMenu() {
	console.log('\n' + hr('═'));
	console.log('  🛠️   SipChecker Admin');
	console.log(hr('═'));
	console.log('  1.  Profile utilisateur');
	console.log('  2.  Envoyer le compte rendu');
	console.log('  3.  Sip information');
	console.log('  4.  Statistiques globales');
	console.log('  0.  Quitter');
	console.log(hr());

	const choice = (await ask('  Choix : ')).trim();

	try {
		if (choice === '1') await profileUser();
		else if (choice === '2') await sendReport();
		else if (choice === '3') await sipInfo();
		else if (choice === '4') await globalStats();
		else if (choice === '0') {
			await pool.end();
			rl.close();
			return;
		} else {
			console.log('  ⚠️  Choix invalide.');
		}
	} catch (err) {
		console.error(`\n  ❌ Erreur : ${err.message}`);
	}

	await mainMenu();
}

mainMenu();
