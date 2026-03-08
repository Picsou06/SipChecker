const SIP_EMOJI = process.env.SIP_EMOJI;

module.exports = {
	close: 'Sluiten',

	sip: {
		titleSelf: 'Mijn Sips',
		titleOther: (name) => `${name} Sips`,
		firstSipSelf: (time) => `Je hebt vandaag voor het eerst gedronken om ${time} :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} heeft vandaag voor het eerst gedronken om ${time} :${SIP_EMOJI}:`,
		noSipSelf: () => 'Je hebt vandaag nog niets gedronken 🫗',
		noSipOther: (ref) => `${ref} heeft vandaag nog niets gedronken 🫗`,
		labelMessages: '*Drankjes (berichten)*',
		labelReactions: '*Aanmoedigingen (reacties)*',
		sectionToday: '*Vandaag*',
		sectionGlobal: '*Totaal ooit*',
		total: (n) => `Totaal vandaag: *${n}*`,
		totalGlobal: (n) => `Totaal ooit: *${n}*`,
	},

	notificate: {
		invalidArg: 'Gebruik: `/sip-notificate true` of `/sip-notificate false`',
		enabled: 'Meldingen ingeschakeld. Je wordt vermeld in het dagelijkse rapport.',
		disabled: 'Meldingen uitgeschakeld. Je verschijnt zonder vermelding in het dagelijkse rapport.',
	},

	leaderboard: {
		titleDay: 'Sips van vandaag',
		titleStats: 'Alle Sips',
		labelMessages: '*Drankjes (berichten)*',
		labelReactions: '*Aanmoedigingen (reacties)*',
		top3Header: '*Top 3*',
		noSips: '_Nog geen drankjes geregistreerd._',
		topEntry: (medal, ref, total, msg, react) =>
			`${medal} ${ref} - *${total}*  _(${msg} drankjes · ${react} aanmoedigingen)_`,
	},
};
