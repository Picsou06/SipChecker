const SIP_EMOJI = process.env.SIP_EMOJI;

module.exports = {
	close: 'Sulje',

	sip: {
		titleSelf: 'Omat Sipit',
		titleOther: (name) => `${name} Sipit`,
		firstSipSelf: (time) => `Joit ensimmäisen juomasi tänään kello ${time} :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} joi ensimmäisen juomansa tänään kello ${time} :${SIP_EMOJI}:`,
		noSipSelf: () => 'Et ole juonut tänään 🫗',
		noSipOther: (ref) => `${ref} ei ole juonut tänään 🫗`,
		labelMessages: '*Juomat (viestit)*',
		labelReactions: '*Kannustukset (reaktiot)*',
		sectionToday: '*Tänään*',
		sectionGlobal: '*Kaikkiaan*',
		total: (n) => `Yhteensä tänään: *${n}*`,
		totalGlobal: (n) => `Kaikkiaan: *${n}*`,
	},

	leaderboard: {
		titleDay: 'Tämän päivän Sipit',
		titleStats: 'Kaikki Sipit',
		labelMessages: '*Juomat (viestit)*',
		labelReactions: '*Kannustukset (reaktiot)*',
		top3Header: '*Top 3*',
		noSips: '_Ei juomia rekisteröity vielä._',
		topEntry: (medal, ref, total, msg, react) =>
			`${medal} ${ref} - *${total}*  _(${msg} juomaa · ${react} kannustusta)_`,
	},
};
