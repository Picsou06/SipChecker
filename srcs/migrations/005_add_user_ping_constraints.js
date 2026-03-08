async function up(conn) {
	await conn.execute(`
		ALTER TABLE user_ping
		ADD CONSTRAINT uq_user_ping_user_id UNIQUE (user_id)
	`);
}

async function down(conn) {
	await conn.execute(`
		ALTER TABLE user_ping
		DROP INDEX uq_user_ping_user_id
	`);
}

module.exports = { up, down };
