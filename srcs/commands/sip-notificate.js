const { pool } = require('../db');
const { getUserPrefs } = require('../utils');
const { getT } = require('../locales');

async function handleSipNotificate({ command, ack, respond, client }) {
	await ack();

	const arg = (command.text || '').trim().toLowerCase();
	const { locale } = await getUserPrefs(client, command.user_id);
	const t = getT(locale).notificate;

	if (arg !== 'true' && arg !== 'false') {
		await respond({
			text: t.invalidArg,
			response_type: 'ephemeral',
		});
		return;
	}

	const enabled = arg === 'true';
	const userId = command.user_id;

	await pool.execute(`
		INSERT INTO user_ping (user_id, enabled)
		VALUES (?, ?)
		ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_at = CURRENT_TIMESTAMP
	`, [userId, enabled]);

	await respond({
		text: enabled ? t.enabled : t.disabled,
		response_type: 'ephemeral',
	});
}

module.exports = { handleSipNotificate };
