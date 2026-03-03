const CHANNEL = process.env.CHANNEL_SIP_ALERTS;
const SIP_EMOJI = process.env.SIP_EMOJI;
const { logSip } = require('./db');

function registerListeners(app) {
	app.event('message', async ({ event }) => {
		if (event.subtype) return;

		if (event.text && event.text.includes(SIP_EMOJI)) {
			logSip(event.user, event.channel, 'message');
		}
	});

	app.event('reaction_added', async ({ event }) => {
		if (event.reaction === SIP_EMOJI) {
			logSip(event.user, event.item.channel, 'reaction');
		}
	});
}

module.exports = { registerListeners };
