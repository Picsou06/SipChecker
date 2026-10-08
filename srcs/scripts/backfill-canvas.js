require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { WebClient } = require('@slack/web-api');
const { getDailyStats, buildContent } = require('../jobs/dailyReport');
const { pool } = require('../db');

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const CANVAS_ID = process.env.CANEVAS_LOGS;

const DATES = ['2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24'];

async function run() {
	if (!CANVAS_ID) {
		console.error('❌ CANEVAS_LOGS non défini dans .env');
		process.exit(1);
	}

	console.log(`🎯 Canvas cible : ${CANVAS_ID}`);
	console.log(`📅 Dates à backfiller : ${DATES.join(', ')}\n`);

	// Insert oldest first so newest ends up at top (insert_at_start)
	for (const dateStr of DATES) {
		process.stdout.write(`⏳ Génération du rapport pour ${dateStr}...`);
		try {
			const stats = await getDailyStats(dateStr);
			const content = await buildContent(stats, dateStr, client);

			await client.canvases.edit({
				canvas_id: CANVAS_ID,
				changes: [{
					operation: 'insert_at_start',
					document_content: content,
				}],
			});

			console.log(` ✅`);
		} catch (err) {
			console.log(` ❌ ${err.message}`);
		}
	}

	console.log('\n✅ Backfill terminé.');
	await pool.end();
}

run().catch(err => {
	console.error('❌ Erreur fatale:', err.message);
	process.exit(1);
});
