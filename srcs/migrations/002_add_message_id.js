async function up(conn) {
	await conn.execute(`
		ALTER TABLE sip_events
		ADD COLUMN message_id VARCHAR(255) NOT NULL DEFAULT ''
			COMMENT 'ID Slack du message source (ts)'
	`);

	await conn.execute(`
		ALTER TABLE sip_events
		ADD UNIQUE KEY uq_user_message_type (user_id, message_id, type)
	`);
}

async function down(conn) {
	await conn.execute('ALTER TABLE sip_events DROP INDEX uq_user_message_type');
	await conn.execute('ALTER TABLE sip_events DROP COLUMN message_id');
}

module.exports = { up, down };
