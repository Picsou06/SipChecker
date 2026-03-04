require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	timezone: 'Z',
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

async function logSip(userId, channelId, type, messageId) {
	await pool.execute(
		'INSERT IGNORE INTO sip_events (user_id, channel_id, type, message_id) VALUES (?, ?, ?, ?)',
		[userId, channelId, type, messageId]
	);
}

async function removeSip(userId, messageId) {
	await pool.execute(
		"DELETE FROM sip_events WHERE user_id = ? AND message_id = ? AND type = 'reaction'",
		[userId, messageId]
	);
}

// Recupere les utilisateur qui ont reagit hier mais pas aujourd'hui et retourne la liste des identifiants Slack
async function getUserWhoForgotSips() {
	const [rows] = await pool.execute(`
		SELECT DISTINCT user_id
		FROM sip_events
			AND DATE(created_at) = CURDATE() - INTERVAL 1 DAY
			AND user_id NOT IN (
				SELECT user_id
				FROM sip_events
					AND DATE(created_at) = CURDATE()
			)
	`);
	return rows.map(row => row.user_id);
}


module.exports = { pool, logSip, removeSip, getUserWhoForgotSips };
