const locales = {
	en: require('./en'),
	fr: require('./fr'),
	de: require('./de'),
	nl: require('./nl'),
	es: require('./es'),
	fi: require('./fi'),
	it: require('./it'),
	pl: require('./pl'),
	pt: require('./pt'),
	cs: require('./cs'),
	ms: require('./ms'),
	uz: require('./uz'),
	tr: require('./tr'),
};

function getT(slackLocale) {
	const lang = (slackLocale || 'en').split('-')[0].toLowerCase();
	return locales[lang] || locales.en;
}

function formatTime(date, slackLocale, tz) {
	return new Date(date).toLocaleTimeString(slackLocale || 'en-US', {
		hour: '2-digit', minute: '2-digit', timeZone: tz || 'UTC',
	});
}

const SUPPORTED_LOCALES = Object.keys(locales);

module.exports = { getT, formatTime, SUPPORTED_LOCALES };
