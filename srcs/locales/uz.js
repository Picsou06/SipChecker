const SIP_EMOJI = (process.env.SIP_EMOJI || "").split(",")[0].trim();

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
		sectionToday: '*Bugun*',
		sectionGlobal: '*Jami*',
		total: (n) => `Bugun jami: *${n}*`,
		totalGlobal: (n) => `Umumiy jami: *${n}*`,
	},

	notificate: {
		invalidArg: 'Foydalanish: `/sip-notificate true` yoki `/sip-notificate false`',
		enabled: 'Bildirishnomalar yoqildi. Kunlik hisobotda siz tilga olinasiz.',
		disabled: "Bildirishnomalar o'chirildi. Siz kunlik hisobotda tilga olinmaysiz.",
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
