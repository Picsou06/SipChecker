async function up(conn) {
	// Supprime les doublons en gardant la ligne avec l'id le plus élevé
	await conn.execute(`
		DELETE p1 FROM user_ping p1
		INNER JOIN user_ping p2
		WHERE p1.user_id = p2.user_id AND p1.id < p2.id
	`);

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
