const SIP_EMOJI = process.env.SIP_EMOJI;

module.exports = {
	close: 'Zamknij',

	sip: {
		titleSelf: 'Moje Sipy',
		titleOther: (name) => `${name} Sipy`,
		firstSipSelf: (time) => `Wypiłeś dziś pierwszy drink o ${time} :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} wypił dziś pierwszy drink o ${time} :${SIP_EMOJI}:`,
		noSipSelf: () => 'Nie piłeś jeszcze nic dziś 🫗',
		noSipOther: (ref) => `${ref} jeszcze nic nie pił dziś 🫗`,
		labelMessages: '*Drinki (wiadomości)*',
		labelReactions: '*Zachęty (reakcje)*',
		total: (n) => `Łącznie dziś: *${n}*`,
	},

	leaderboard: {
		titleDay: 'Sipy dnia',
		titleStats: 'Wszystkie Sipy',
		labelMessages: '*Drinki (wiadomości)*',
		labelReactions: '*Zachęty (reakcje)*',
		top3Header: '*Top 3*',
		noSips: '_Brak zarejestrowanych drinków._',
		topEntry: (medal, ref, total, msg, react) =>
			`${medal} ${ref} - *${total}*  _(${msg} drinki · ${react} zachęty)_`,
	},
};
