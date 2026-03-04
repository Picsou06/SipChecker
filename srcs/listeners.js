const CHANNEL = process.env.CHANNEL_SIP_ALERTS;
const SIP_EMOJI = process.env.SIP_EMOJI;
const { logSip, removeSip } = require('./db');

function registerListeners(app) {
	app.event('message', async ({ event }) => {
		if (event.subtype) return;

		if (event.text && event.text.includes(':'+SIP_EMOJI+':')) {
			logSip(event.user, event.channel, 'message', event.ts);
		}
	});

	app.event('reaction_added', async ({ event }) => {
		if (event.reaction === SIP_EMOJI) {
			logSip(event.user, event.item.channel, 'reaction', event.item.ts);
		}
	});

	app.event('reaction_removed', async ({ event }) => {
		if (event.reaction === SIP_EMOJI) {
			removeSip(event.user, event.item.ts);
		}
	});
}

module.exports = { registerListeners };
