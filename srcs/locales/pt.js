const SIP_EMOJI = process.env.SIP_EMOJI;

module.exports = {
	close: 'Fechar',

	sip: {
		titleSelf: 'Meus Sips',
		titleOther: (name) => `${name} Sips`,
		firstSipSelf: (time) => `Você bebeu pela primeira vez hoje às ${time} :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} bebeu pela primeira vez hoje às ${time} :${SIP_EMOJI}:`,
		noSipSelf: () => 'Você não bebeu nada hoje 🫗',
		noSipOther: (ref) => `${ref} não bebeu nada hoje 🫗`,
		labelMessages: '*Bebidas (mensagens)*',
		labelReactions: '*Encorajamentos (reações)*',
		sectionToday: '*Hoje*',
		sectionGlobal: '*Total geral*',
		total: (n) => `Total hoje: *${n}*`,
		totalGlobal: (n) => `Total geral: *${n}*`,
	},

	leaderboard: {
		titleDay: 'Sips do dia',
		titleStats: 'Todos os Sips',
		labelMessages: '*Bebidas (mensagens)*',
		labelReactions: '*Encorajamentos (reações)*',
		top3Header: '*Top 3*',
		noSips: '_Nenhuma bebida registrada ainda._',
		topEntry: (medal, ref, total, msg, react) =>
			`${medal} ${ref} - *${total}*  _(${msg} bebidas · ${react} encorajamentos)_`,
	},
};
