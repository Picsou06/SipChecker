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

async function logSip(userId, channelId, type) {
	await pool.execute(
		'INSERT INTO sip_events (user_id, channel_id, type) VALUES (?, ?, ?)',
		[userId, channelId, type]
	);
}

module.exports = { pool, logSip };
