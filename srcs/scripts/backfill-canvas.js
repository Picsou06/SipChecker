// Régénère le canvas des rapports (CANEVAS_LOGS) : tous les jours consécutifs jusqu'à hier, dans la limite
// de taille, comme le fait le rapport quotidien. Les jours manquants sont recréés, les plus anciens retirés.
//   node scripts/backfill-canvas.js            -> écrit dans le canvas
//   node scripts/backfill-canvas.js --dry-run  -> affiche seulement les jours et la taille
//   node scripts/backfill-canvas.js --dry-run --max-bytes 200000 --until 2026-10-07
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { WebClient } = require('@slack/web-api');
const { buildCanvasReports, refreshCanvas, CANVAS_MAX_BYTES } = require('../jobs/dailyReport');
const { pool } = require('../db');

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes('--dry-run');
const maxBytes = Number(option('--max-bytes')) || CANVAS_MAX_BYTES;
const until = option('--until') || new Date(Date.now() - 864e5).toISOString().slice(0, 10);

async function run() {
	if (!process.env.CANEVAS_LOGS) {
		console.error('❌ CANEVAS_LOGS non défini dans .env');
		process.exit(1);
	}

	if (dryRun) {
		const reports = await buildCanvasReports(client, until, maxBytes);
		const bytes = reports.reduce((n, r) => n + r.size, 0);
		const sizes = reports.map(r => r.size);
		console.log(`🔎 ${reports.length} jours, du ${reports[reports.length - 1].dateStr} au ${reports[0].dateStr}, ${bytes} octets (limite ${maxBytes})`);
		console.log(`   taille d'un jour : min ${Math.min(...sizes)}, max ${Math.max(...sizes)}, moyenne ${Math.round(bytes / reports.length)} octets`);
	} else {
		const r = await refreshCanvas(client, until);
		console.log(`✅ Canvas régénéré : ${r.days} jours, du ${r.from} au ${r.to}, ${r.bytes} octets.`);
	}
	await pool.end();
}

run().catch(err => {
	console.error('❌ Erreur fatale:', err.data?.error || err.message);
	process.exit(1);
});
