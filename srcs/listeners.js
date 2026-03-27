const fs = require('fs');
const path = require('path');
const SIP_EMOJIS = (process.env.SIP_EMOJI || '').split(',').map(e => e.trim()).filter(Boolean);
const UNSIP_EMOJIS = (process.env.UNSIP_EMOJI || '').split(',').map(e => e.trim()).filter(Boolean);
const { logSip, removeSip, logUnsip, removeUnsip, hasMessageSip } = require('./db');

function registerListeners(app) {
	app.event('message', async ({ event, client }) => {
		if (event.subtype) return;

		const sipEmoji = event.text && SIP_EMOJIS.find(e => event.text.includes(':'+e+':'));
		if (sipEmoji) {
			const isFirstSip = !(await hasMessageSip(event.user));
			await logSip(event.user, event.channel, 'message', event.ts, sipEmoji);
			if (isFirstSip) {
				const welcomeText = 'Welcome to the cult. Your first sip is on us. 🍻:sip:';
				const welcomeFilePath = path.join(__dirname, 'files', 'welcome_sip.mp4');
				if (fs.existsSync(welcomeFilePath)) {
					try {
						await client.files.upload({
							channels: event.channel,
							file: fs.createReadStream(welcomeFilePath),
							filename: 'welcome_sip.mp4',
							title: 'Welcome sip',
							initial_comment: welcomeText,
							thread_ts: event.ts,
						});
						return;
					} catch (err) {
						console.warn(`⚠️  files.upload échoué: ${err.message}`);
					}
				}
				await client.chat.postMessage({
					channel: event.channel,
					thread_ts: event.ts,
					text: welcomeText,
				});
			}
		}

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
