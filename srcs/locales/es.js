const SIP_EMOJI = process.env.SIP_EMOJI;

module.exports = {
	close: 'Cerrar',

	sip: {
		titleSelf: 'Mis Sips',
		titleOther: (name) => `${name} Sips`,
		firstSipSelf: (time) => `Tomaste tu primera bebida hoy a las ${time} :${SIP_EMOJI}:`,
		firstSipOther: (ref, time) => `${ref} tomó su primera bebida hoy a las ${time} :${SIP_EMOJI}:`,
		noSipSelf: () => 'No has bebido nada hoy 🫗',
		noSipOther: (ref) => `${ref} no ha bebido nada hoy 🫗`,
		labelMessages: '*Bebidas (mensajes)*',
		labelReactions: '*Ánimos (reacciones)*',
		sectionToday: '*Hoy*',
		sectionGlobal: '*Total global*',
		total: (n) => `Total hoy: *${n}*`,
		totalGlobal: (n) => `Total global: *${n}*`,
	},

	notificate: {
		invalidArg: 'Uso: `/sip-notificate true` o `/sip-notificate false`',
		enabled: 'Notificaciones activadas. Serás mencionado en el informe diario.',
		disabled: 'Notificaciones desactivadas. Aparecerás sin mención en el informe diario.',
	},

	leaderboard: {
		titleDay: 'Sips del día',
		titleStats: 'Todos los Sips',
		labelMessages: '*Bebidas (mensajes)*',
		labelReactions: '*Ánimos (reacciones)*',
		top3Header: '*Top 3*',
		noSips: '_Ninguna bebida registrada aún._',
		topEntry: (medal, ref, total, msg, react) =>
			`${medal} ${ref} - *${total}*  _(${msg} bebidas · ${react} ánimos)_`,
	},
};
