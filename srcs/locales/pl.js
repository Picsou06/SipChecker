const SIP_EMOJI = (process.env.SIP_EMOJI || "").split(",")[0].trim();

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
		sectionToday: '*Dziś*',
		sectionGlobal: '*W sumie*',
		total: (n) => `Łącznie dziś: *${n}*`,
		totalGlobal: (n) => `W sumie: *${n}*`,
	},

	notificate: {
		invalidArg: 'Użycie: `/sip-notificate true` lub `/sip-notificate false`',
		enabled: 'Powiadomienia włączone. Zostaniesz wspomniany w codziennym raporcie.',
		disabled: 'Powiadomienia wyłączone. Pojawisz się bez wzmianki w codziennym raporcie.',
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
