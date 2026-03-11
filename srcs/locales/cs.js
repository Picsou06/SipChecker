const SIP_EMOJI = (process.env.SIP_EMOJI || "").split(",")[0].trim();

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
		sectionToday: '*Dnes*',
		sectionGlobal: '*Celkem*',
		total: (n) => `Celkem dnes: *${n}*`,
		totalGlobal: (n) => `Celkem: *${n}*`,
	},

	notificate: {
		invalidArg: 'Použití: `/sip-notificate true` nebo `/sip-notificate false`',
		enabled: 'Oznámení zapnuta. Budeš zmíněn v denním přehledu.',
		disabled: 'Oznámení vypnuta. Zobrazíš se bez zmínky v denním přehledu.',
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
