const SIP_EMOJI = (process.env.SIP_EMOJI || "").split(",")[0].trim();

module.exports = {
	close: 'Chiudi',

	sip: {
		titleSelf: 'I miei Sips',
		titleOther: (name) => `${name} Sips`,
		firstSipSelf: (time) => `Hai bevuto per la prima volta oggi alle ${time} :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} ha bevuto per la prima volta oggi alle ${time} :${SIP_EMOJI}:`,
		noSipSelf: () => 'Non hai bevuto nulla oggi 🫗',
		noSipOther: (ref) => `${ref} non ha bevuto nulla oggi 🫗`,
		labelMessages: '*Bevute (messaggi)*',
		labelReactions: '*Incoraggiamenti (reazioni)*',
		sectionToday: '*Oggi*',
		sectionGlobal: '*Totale globale*',
		total: (n) => `Totale oggi: *${n}*`,
		totalGlobal: (n) => `Totale globale: *${n}*`,
		bestStreak: (n) => `Best streak: *${n} days*`,
	},

	notificate: {
		invalidArg: 'Uso: `/sip-notificate true` o `/sip-notificate false`',
		enabled: 'Notifiche attivate. Sarai menzionato nel rapporto giornaliero.',
		disabled: 'Notifiche disattivate. Apparirai senza menzione nel rapporto giornaliero.',
	},

	leaderboard: {
		titleDay: 'Sips di oggi',
		titleStats: 'Tutti i Sips',
		labelMessages: '*Bevute (messaggi)*',
		labelReactions: '*Incoraggiamenti (reazioni)*',
		top3Header: '*Top 3*',
		noSips: '_Nessuna bevuta registrata ancora._',
		topEntry: (medal, ref, total, msg, react, streakLabel) =>
			`${medal} ${ref} - *${total}*  _(${msg} bevute · ${react} incoraggiamenti)_ · ${streakLabel}`,
	},
};
