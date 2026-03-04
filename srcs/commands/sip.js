const { pool } = require('../db');
const { getUserPrefs } = require('../utils');
const { getT, formatTime, SUPPORTED_LOCALES } = require('../locales');

function parseArgs(text) {
	const tokens = (text || '').trim().split(/\s+/).filter(Boolean);
	let forcedLocale = null;
	if (tokens.length > 0 && SUPPORTED_LOCALES.includes(tokens[tokens.length - 1].toLowerCase())) {
		forcedLocale = tokens.pop().toLowerCase();
	}
	return { userText: tokens.join(' '), forcedLocale };
}

function parseTargetUser(text, fallback) {
	if (!text || !text.trim()) return { userId: fallback, rawName: null };

	const idMatch = text.match(/<@([A-Z0-9]+)(?:\|[^>]+)?>/);
	if (idMatch) return { userId: idMatch[1], rawName: null };

	const nameMatch = text.trim().match(/^@?([\w.]+)$/);
	if (nameMatch) return { userId: null, rawName: nameMatch[1] };

	return { userId: fallback, rawName: null };
}

async function resolveUsername(client, name) {
	const res = await client.users.list({ limit: 200 });
	const user = res.members.find(m =>
		!m.deleted && !m.is_bot &&
		(m.name === name || m.profile?.display_name === name)
	);
	return user?.id || null;
}

async function getSipStats(userId) {
	const [[todayRows], [globalRows]] = await Promise.all([
		pool.execute(
			`SELECT
				MIN(CASE WHEN type = 'message' THEN created_at END) AS first_sip,
				SUM(type = 'message') AS sip_count,
				SUM(type = 'reaction') AS reaction_count
			FROM sip_events
			WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
			[userId]
		),
		pool.execute(
			`SELECT
				SUM(type = 'message') AS sip_count,
				SUM(type = 'reaction') AS reaction_count
			FROM sip_events
			WHERE user_id = ?`,
			[userId]
		),
	]);
	return { today: todayRows[0], global: globalRows[0] };
}

function buildModal({ today, global: glob }, targetUserId, isSelf, targetName, tz, locale) {
	const t = getT(locale);
	const hasDrunk = Number(today.sip_count) > 0;
	const ref = `<@${targetUserId}>`;
	const blocks = [];

	if (hasDrunk) {
		const time = formatTime(today.first_sip, locale, tz);
		const text = isSelf ? t.sip.firstSipSelf(time) : t.sip.firstSipOther(ref, time);
		blocks.push({ type: 'section', text: { type: 'mrkdwn', text } });
	} else {
		const text = isSelf ? t.sip.noSipSelf() : t.sip.noSipOther(ref);
		blocks.push({ type: 'section', text: { type: 'mrkdwn', text } });
	}

	blocks.push({ type: 'divider' });

	blocks.push({ type: 'section', text: { type: 'mrkdwn', text: t.sip.sectionToday } });
	blocks.push({
		type: 'section',
		fields: [
			{ type: 'mrkdwn', text: `${t.sip.labelMessages}\n${today.sip_count ?? 0}` },
			{ type: 'mrkdwn', text: `${t.sip.labelReactions}\n${today.reaction_count ?? 0}` },
		],
	});
	blocks.push({
		type: 'context',
		elements: [
			{ type: 'mrkdwn', text: t.sip.total(Number(today.sip_count ?? 0) + Number(today.reaction_count ?? 0)) },
		],
	});

	blocks.push({ type: 'divider' });

	blocks.push({ type: 'section', text: { type: 'mrkdwn', text: t.sip.sectionGlobal } });
	blocks.push({
		type: 'section',
		fields: [
			{ type: 'mrkdwn', text: `${t.sip.labelMessages}\n${glob.sip_count ?? 0}` },
			{ type: 'mrkdwn', text: `${t.sip.labelReactions}\n${glob.reaction_count ?? 0}` },
		],
	});
	blocks.push({
		type: 'context',
		elements: [
			{ type: 'mrkdwn', text: t.sip.totalGlobal(Number(glob.sip_count ?? 0) + Number(glob.reaction_count ?? 0)) },
		],
	});

	const title = isSelf ? t.sip.titleSelf : t.sip.titleOther(`@${targetName}`);

	return {
		type: 'modal',
		title: { type: 'plain_text', text: title, emoji: true },
		close: { type: 'plain_text', text: t.close, emoji: true },
		blocks,
	};
}

async function handleSipCommand({ command, ack, client, respond }) {
	await ack();

	const { userText, forcedLocale } = parseArgs(command.text);
	let { userId: targetUserId, rawName } = parseTargetUser(userText, command.user_id);

	if (rawName) {
		targetUserId = await resolveUsername(client, rawName);
		if (!targetUserId) {
			await respond({ text: `Could not find user \`@${rawName}\`.`, response_type: 'ephemeral' });
			return;
		}
	}

	const isSelf = targetUserId === command.user_id;

	const promises = [
		getUserPrefs(client, command.user_id),
		getSipStats(targetUserId),
	];
	if (!isSelf) promises.push(getUserPrefs(client, targetUserId));

	const [{ tz, locale }, stats, targetPrefs] = await Promise.all(promises);
	const targetName = isSelf ? null : targetPrefs.displayName;
	const resolvedLocale = forcedLocale || locale;

	await client.views.open({
		trigger_id: command.trigger_id,
		view: buildModal(stats, targetUserId, isSelf, targetName, tz, resolvedLocale),
	});
}

module.exports = { handleSipCommand };
