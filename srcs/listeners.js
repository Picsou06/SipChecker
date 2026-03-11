const CHANNEL = process.env.CHANNEL_SIP_ALERTS;
const SIP_EMOJIS = (process.env.SIP_EMOJI || '').split(',').map(e => e.trim()).filter(Boolean);
const { logSip, removeSip } = require('./db');

function registerListeners(app) {
	app.event('message', async ({ event }) => {
		if (event.subtype) return;

		if (event.text && SIP_EMOJIS.some(e => event.text.includes(':'+e+':'))) {
			logSip(event.user, event.channel, 'message', event.ts);
		}
	});

	app.event('reaction_added', async ({ event }) => {
		if (SIP_EMOJIS.includes(event.reaction)) {
			logSip(event.user, event.item.channel, 'reaction', event.item.ts);
		}
	});

	app.event('reaction_removed', async ({ event }) => {
		if (SIP_EMOJIS.includes(event.reaction)) {
			removeSip(event.user, event.item.ts);
		}
	});
}

module.exports = { registerListeners };
