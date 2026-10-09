// healthcheck.js — healthcheck Docker de SipChecker (mode HTTP de Slack Bolt, pas de connexion permanente) :
//   1. le serveur HTTP local répond (Slack peut lui livrer les événements via Caddy) ;
//   2. le token du bot est accepté par Slack (auth.test).
const port = process.env.PORT || 3000;

(async () => {
	try {
		await fetch(`http://127.0.0.1:${port}/slack/events`, { signal: AbortSignal.timeout(5000) });
	} catch (e) {
		console.error('serveur local injoignable :', e.message);
		process.exit(1);
	}
	try {
		const r = await fetch('https://slack.com/api/auth.test', {
			method: 'POST',
			headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
			signal: AbortSignal.timeout(10000),
		});
		const j = await r.json();
		if (!j.ok) {
			console.error('auth.test refusé :', j.error);
			process.exit(1);
		}
	} catch (e) {
		console.error('Slack injoignable :', e.message);
		process.exit(1);
	}
	process.exit(0);
})();
