async function up(conn) {
	await conn.execute(`
		ALTER TABLE sip_events
		MODIFY COLUMN message_id VARCHAR(255) NOT NULL DEFAULT ''
			COMMENT 'ID Slack du message source (ts)'
			AFTER channel_id
	`);
}

async function down(conn) {
	await conn.execute(`
		ALTER TABLE sip_events
		MODIFY COLUMN message_id VARCHAR(255) NOT NULL DEFAULT ''
			COMMENT 'ID Slack du message source (ts)'
			AFTER type
	`);
}

module.exports = { up, down };
