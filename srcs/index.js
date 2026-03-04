require('dotenv').config();
const { App } = require('@slack/bolt');
const { registerListeners } = require('./listeners');
const { handleSipCommand } = require('./commands/sip');
const { handleSipDay, handleSipStats } = require('./commands/sip-leaderboard');
const { registerDailyReport } = require('./jobs/dailyReport');

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SIGNING_SECRET,
	appId: process.env.APP_ID,
	port: process.env.PORT || 3000,
});

registerListeners(app);

app.error(async (error) => {
	console.error('❌ Bolt error:', error);
});

app.command('/sip', handleSipCommand);
app.command('/sip-day', handleSipDay);
app.command('/sip-stats', handleSipStats);

(async () => {
	await app.start();
	console.log('⚡️ SipChecker bot is running!');

	try {
		await app.client.conversations.join({ channel: process.env.CHANNEL_SIP_ALERTS });
		console.log(`✅ Bot rejoint le channel ${process.env.CHANNEL_SIP_ALERTS}`);
	} catch (err) {
		console.warn(`⚠️  conversations.join échoué: ${err.message}`);
	}
	
	registerDailyReport(app);
})();