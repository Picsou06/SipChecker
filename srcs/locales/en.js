const SIP_EMOJI = (process.env.SIP_EMOJI || "").split(",")[0].trim();

module.exports = {
	close: 'Close',

	sip: {
		titleSelf: 'Your Sips',
		titleOther: (name) => `${name} Sips`,
		firstSipSelf: (time) => `You had your first drink today at ${time} :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} had their first drink today at ${time} :${SIP_EMOJI}:`,
		noSipSelf: () => "You haven't had a drink today 🫗",
		noSipOther: (ref) => `${ref} hasn't had a drink today 🫗`,
		labelMessages: '*Drinks (messages)*',
		labelReactions: '*Encouragements (reactions)*',
		sectionToday: '*Today*',
		sectionGlobal: '*All time*',
		total: (n) => `Total today: *${n}*`,
		totalGlobal: (n) => `Total all time: *${n}*`,
		bestStreak: (n) => `Best streak: *${n} days*`,
	},

	notificate: {
		invalidArg: 'Usage: `/sip-notificate true` or `/sip-notificate false`',
		enabled: 'Notifications enabled. You will be pinged in the daily report.',
		disabled: 'Notifications disabled. You will appear without ping in the daily report.',
	},

	leaderboard: {
		titleDay: "Today's Sips",
		titleStats: 'All-time Sips',
		labelMessages: '*Drinks (messages)*',
		labelReactions: '*Encouragements (reactions)*',
		top3Header: '*Top 3*',
		noSips: '_No drinks recorded yet._',
		topEntry: (medal, ref, total, msg, react, streakLabel) =>
			`${medal} ${ref} - *${total}*  _(${msg} drinks · ${react} encouragements)_ · ${streakLabel}`,
	},
};
