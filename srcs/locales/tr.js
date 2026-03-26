const SIP_EMOJI = (process.env.SIP_EMOJI || "").split(",")[0].trim();

module.exports = {
	close: 'Kapat',

	sip: {
		titleSelf: 'Benim Sip\'lerim',
		titleOther: (name) => `${name} Sip'leri`,
		firstSipSelf: (time) => `Bugün ${time}'de ilk içeceğini içtin :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} bugün ${time}'de ilk içeceğini içti :${SIP_EMOJI}:`,
		noSipSelf: () => 'Bugün henüz bir şey içmediniz 🫗',
		noSipOther: (ref) => `${ref} bugün henüz bir şey içmedi 🫗`,
		labelMessages: '*İçecekler (mesajlar)*',
		labelReactions: '*Teşvikler (tepkiler)*',
		sectionToday: '*Bugün*',
		sectionGlobal: '*Tüm zamanlar*',
		total: (n) => `Bugün toplam: *${n}*`,
		totalGlobal: (n) => `Tüm zamanlarda toplam: *${n}*`,
		bestStreak: (n) => `Best streak: *${n} days*`,
	},

	notificate: {
		invalidArg: 'Kullanım: `/sip-notificate true` veya `/sip-notificate false`',
		enabled: 'Bildirimler etkinleştirildi. Günlük raporda bahsedileceksiniz.',
		disabled: 'Bildirimler devre dışı bırakıldı. Günlük raporda bahsedilmeden görüneceksiniz.',
	},

	leaderboard: {
		titleDay: 'Günün Sip\'leri',
		titleStats: 'Tüm Sip\'ler',
		labelMessages: '*İçecekler (mesajlar)*',
		labelReactions: '*Teşvikler (tepkiler)*',
		top3Header: '*Top 3*',
		noSips: '_Henüz içecek kaydedilmedi._',
		topEntry: (medal, ref, total, msg, react, streakLabel) =>
			`${medal} ${ref} - *${total}*  _(${msg} içecek · ${react} teşvik)_ · ${streakLabel}`,
	},
};
