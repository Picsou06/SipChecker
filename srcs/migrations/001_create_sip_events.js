async function up(conn) {
	await conn.execute(`
		CREATE TABLE IF NOT EXISTS sip_events (
			id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			user_id VARCHAR(50) NOT NULL COMMENT 'ID Slack utilisateur',
			channel_id VARCHAR(50) NOT NULL COMMENT 'ID Slack channel',
			type ENUM('message', 'reaction') NOT NULL COMMENT 'Source du sip',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date et heure du sip',

			INDEX idx_user (user_id),
			INDEX idx_channel (channel_id),
			INDEX idx_type (type),
			INDEX idx_created_at (created_at),
			INDEX idx_user_channel_day (user_id, channel_id, created_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
			COMMENT='Historique de tous les sips détectés par le bot'
	`);

	await conn.execute(`
		CREATE OR REPLACE VIEW v_sip_events AS
		SELECT
			id,
			user_id,
			channel_id,
			type,
			created_at,
			DATE(created_at) AS day,
			DATE_FORMAT(created_at, '%H:%i:%s') AS time,
			DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at_readable
		FROM sip_events
		ORDER BY created_at DESC
	`);
}

async function down(conn) {
	await conn.execute('DROP VIEW IF EXISTS v_sip_events');
	await conn.execute('DROP TABLE IF EXISTS sip_events');
}

module.exports = { up, down };
