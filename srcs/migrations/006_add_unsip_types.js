async function up(conn) {
	await conn.execute(`
		ALTER TABLE sip_events
		MODIFY COLUMN type ENUM('message', 'reaction', 'message_unsip', 'reaction_unsip') NOT NULL
			COMMENT 'Source du sip (unsip variants count as -1)'
	`);
}

async function down(conn) {
	await conn.execute(`
		ALTER TABLE sip_events
		MODIFY COLUMN type ENUM('message', 'reaction') NOT NULL COMMENT 'Source du sip'
	`);
}

module.exports = { up, down };
