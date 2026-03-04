const SIP_EMOJI = process.env.SIP_EMOJI;

module.exports = {
	close: 'Fermer',

	sip: {
		titleSelf: 'Tes Sips',
		titleOther: (name) => `${name} Sips`,
		firstSipSelf: (time) => `Tu as bu pour la première fois aujourd'hui à ${time} :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} a bu pour la première fois aujourd'hui à ${time} :${SIP_EMOJI}:`,
		noSipSelf: () => "Tu n'as pas encore bu aujourd'hui 🫗",
		noSipOther: (ref) => `${ref} n'a pas encore bu aujourd'hui 🫗`,
		labelMessages: '*Verres (messages)*',
		labelReactions: '*Encouragements (réactions)*',
		sectionToday: "*Aujourd'hui*",
		sectionGlobal: '*Global*',
		total: (n) => `Total aujourd'hui : *${n}*`,
		totalGlobal: (n) => `Total global : *${n}*`,
	},

	leaderboard: {
		titleDay: 'Sips du jour',
		titleStats: 'Sips globaux',
		labelMessages: '*Verres (messages)*',
		labelReactions: '*Encouragements (réactions)*',
		top3Header: '*Top 3*',
		noSips: "_Aucune consommation enregistrée pour l'instant._",
		topEntry: (medal, ref, total, msg, react) =>
			`${medal} ${ref} - *${total}*  _(${msg} verres · ${react} encouragements)_`,
	},
};
