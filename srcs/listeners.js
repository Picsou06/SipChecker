const SIP_EMOJIS = (process.env.SIP_EMOJI || '').split(',').map(e => e.trim()).filter(Boolean);
const UNSIP_EMOJIS = (process.env.UNSIP_EMOJI || '').split(',').map(e => e.trim()).filter(Boolean);
const { logSip, removeSip, logUnsip, removeUnsip } = require('./db');

function registerListeners(app) {
	app.event('message', async ({ event }) => {
		if (event.subtype) return;

		const sipEmoji = event.text && SIP_EMOJIS.find(e => event.text.includes(':'+e+':'));
		if (sipEmoji) logSip(event.user, event.channel, 'message', event.ts, sipEmoji);

		const unsipEmoji = event.text && UNSIP_EMOJIS.find(e => event.text.includes(':'+e+':'));
		if (unsipEmoji) logUnsip(event.user, event.channel, 'message', event.ts, unsipEmoji);
	});

	app.event('reaction_added', async ({ event }) => {
		if (SIP_EMOJIS.includes(event.reaction)) {
			logSip(event.user, event.item.channel, 'reaction', event.item.ts, event.reaction);
		}
		if (UNSIP_EMOJIS.includes(event.reaction)) {
			logUnsip(event.user, event.item.channel, 'reaction', event.item.ts, event.reaction);
		}
	});

	app.event('reaction_removed', async ({ event }) => {
		if (SIP_EMOJIS.includes(event.reaction)) {
			removeSip(event.user, event.item.ts);
		}
		if (UNSIP_EMOJIS.includes(event.reaction)) {
			removeUnsip(event.user, event.item.ts);
		}
	});
}

module.exports = { registerListeners };
