const SIP_EMOJI = process.env.SIP_EMOJI;

module.exports = {
	close: 'Tutup',

	sip: {
		titleSelf: 'Sip Saya',
		titleOther: (name) => `${name} Sips`,
		firstSipSelf: (time) => `Anda minum pertama kali hari ini pada ${time} :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} minum pertama kali hari ini pada ${time} :${SIP_EMOJI}:`,
		noSipSelf: () => 'Anda belum minum apa-apa hari ini 🫗',
		noSipOther: (ref) => `${ref} belum minum apa-apa hari ini 🫗`,
		labelMessages: '*Minuman (mesej)*',
		labelReactions: '*Galakan (reaksi)*',
		sectionToday: '*Hari ini*',
		sectionGlobal: '*Keseluruhan*',
		total: (n) => `Jumlah hari ini: *${n}*`,
		totalGlobal: (n) => `Jumlah keseluruhan: *${n}*`,
	},

	leaderboard: {
		titleDay: 'Sip Hari Ini',
		titleStats: 'Semua Sips',
		labelMessages: '*Minuman (mesej)*',
		labelReactions: '*Galakan (reaksi)*',
		top3Header: '*Top 3*',
		noSips: '_Tiada minuman direkodkan lagi._',
		topEntry: (medal, ref, total, msg, react) =>
			`${medal} ${ref} - *${total}*  _(${msg} minuman · ${react} galakan)_`,
	},
};
