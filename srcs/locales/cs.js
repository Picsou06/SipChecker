const SIP_EMOJI = process.env.SIP_EMOJI;

module.exports = {
	close: 'Zavřít',

	sip: {
		titleSelf: 'Moje Sipy',
		titleOther: (name) => `${name} Sipy`,
		firstSipSelf: (time) => `Dnes jsi poprvé pil v ${time} :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} dnes poprvé pil v ${time} :${SIP_EMOJI}:`,
		noSipSelf: () => 'Dnes jsi ještě nic nepil 🫗',
		noSipOther: (ref) => `${ref} dnes ještě nic nepil 🫗`,
		labelMessages: '*Nápoje (zprávy)*',
		labelReactions: '*Povzbuzení (reakce)*',
		total: (n) => `Celkem dnes: *${n}*`,
	},

	leaderboard: {
		titleDay: 'Sipy dneška',
		titleStats: 'Všechny Sipy',
		labelMessages: '*Nápoje (zprávy)*',
		labelReactions: '*Povzbuzení (reakce)*',
		top3Header: '*Top 3*',
		noSips: '_Zatím žádné nápoje zaznamenány._',
		topEntry: (medal, ref, total, msg, react) =>
			`${medal} ${ref} - *${total}*  _(${msg} nápojů · ${react} povzbuzení)_`,
	},
};
