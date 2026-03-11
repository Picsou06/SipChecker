async function up(conn) {
	await conn.execute(`
		ALTER TABLE sip_events
		ADD COLUMN emoji VARCHAR(100) NOT NULL DEFAULT 'sip' COMMENT 'Nom de l emoji utilise' AFTER type
	`);
}

async function down(conn) {
	await conn.execute(`
		ALTER TABLE sip_events
		DROP COLUMN emoji
	`);
}

module.exports = { up, down };
