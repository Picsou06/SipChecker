const SIP_EMOJI = process.env.SIP_EMOJI;

module.exports = {
	close: 'Yopish',

	sip: {
		titleSelf: 'Mening Siplarim',
		titleOther: (name) => `${name} Siplari`,
		firstSipSelf: (time) => `Bugun ${time}da birinchi marta ichdingiz :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} bugun ${time}da birinchi marta ichdi :${SIP_EMOJI}:`,
		noSipSelf: () => 'Bugun hali hech narsa ichmagansiz 🫗',
		noSipOther: (ref) => `${ref} bugun hali hech narsa ichmagan 🫗`,
		labelMessages: '*Ichimliklar (xabarlar)*',
		labelReactions: '*Ragʻbatlar (reaktsiyalar)*',
		total: (n) => `Bugun jami: *${n}*`,
	},

	leaderboard: {
		titleDay: 'Bugungi Siplar',
		titleStats: 'Barcha Siplar',
		labelMessages: '*Ichimliklar (xabarlar)*',
		labelReactions: '*Ragʻbatlar (reaktsiyalar)*',
		top3Header: '*Top 3*',
		noSips: '_Hali ichimliklar qayd etilmagan._',
		topEntry: (medal, ref, total, msg, react) =>
			`${medal} ${ref} - *${total}*  _(${msg} ichimlik · ${react} ragʻbat)_`,
	},
};
