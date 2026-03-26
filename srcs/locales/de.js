const SIP_EMOJI = (process.env.SIP_EMOJI || "").split(",")[0].trim();

module.exports = {
	close: 'Schließen',

	sip: {
		titleSelf: 'Meine Sips',
		titleOther: (name) => `${name} Sips`,
		firstSipSelf: (time) => `Du hast heute zum ersten Mal um ${time} getrunken :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} hat heute zum ersten Mal um ${time} getrunken :${SIP_EMOJI}:`,
		noSipSelf: () => 'Du hast heute noch nichts getrunken 🫗',
		noSipOther: (ref) => `${ref} hat heute noch nichts getrunken 🫗`,
		labelMessages: '*Getränke (Nachrichten)*',
		labelReactions: '*Ermutigungen (Reaktionen)*',
		sectionToday: '*Heute*',
		sectionGlobal: '*Gesamt*',
		total: (n) => `Heute gesamt: *${n}*`,
		totalGlobal: (n) => `Gesamt: *${n}*`,
		bestStreak: (n) => `Best streak: *${n} days*`,
	},

	notificate: {
		invalidArg: 'Verwendung: `/sip-notificate true` oder `/sip-notificate false`',
		enabled: 'Benachrichtigungen aktiviert. Du wirst im täglichen Bericht erwähnt.',
		disabled: 'Benachrichtigungen deaktiviert. Du erscheinst ohne Erwähnung im täglichen Bericht.',
	},

	leaderboard: {
		titleDay: 'Sips des Tages',
		titleStats: 'Alle Sips',
		labelMessages: '*Getränke (Nachrichten)*',
		labelReactions: '*Ermutigungen (Reaktionen)*',
		top3Header: '*Top 3*',
		noSips: '_Heute noch keine Getränke erfasst._',
		topEntry: (medal, ref, total, msg, react, streakLabel) =>
			`${medal} ${ref} - *${total}*  _(${msg} Getränke · ${react} Ermutigungen)_ · ${streakLabel}`,
	},
};
