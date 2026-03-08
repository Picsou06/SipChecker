async function up(conn) {
	await conn.execute(`
		CREATE TABLE user_ping (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id VARCHAR(50) NOT NULL,
			enabled BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)
	`);
}

async function down(conn) {
	await conn.execute(`
		DROP TABLE user_ping
	`);
}

module.exports = { up, down };
