require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(conn) {
	await conn.execute(`
		CREATE TABLE IF NOT EXISTS migrations (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(255) NOT NULL UNIQUE,
			applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);
}

async function getAppliedMigrations(conn) {
	const [rows] = await conn.execute('SELECT name FROM migrations ORDER BY name ASC');
	return new Set(rows.map(r => r.name));
}

async function getMigrationFiles() {
	return fs.readdirSync(MIGRATIONS_DIR)
		.filter(f => f.endsWith('.js'))
		.sort();
}

async function runUp() {
	const conn = await pool.getConnection();
	try {
		await ensureMigrationsTable(conn);
		const applied = await getAppliedMigrations(conn);
		const files = await getMigrationFiles();
		const pending = files.filter(f => !applied.has(f));

		if (pending.length === 0) {
			console.log('✅ Aucune migration en attente.');
			return;
		}

		for (const file of pending) {
			console.log(`⏳ Application de ${file}...`);
			const migration = require(path.join(MIGRATIONS_DIR, file));
			await migration.up(conn);
			await conn.execute('INSERT INTO migrations (name) VALUES (?)', [file]);
			console.log(`✅ ${file} appliquée.`);
		}
	} finally {
		conn.release();
	}
}

async function runDown() {
	const conn = await pool.getConnection();
	try {
		await ensureMigrationsTable(conn);
		const applied = await getAppliedMigrations(conn);
		const files = await getMigrationFiles();
		const toRevert = files.filter(f => applied.has(f)).reverse();

		if (toRevert.length === 0) {
			console.log('Aucune migration à annuler.');
			return;
		}

		// Annule uniquement la dernière migration
		const last = toRevert[0];
		console.log(`⏳ Annulation de ${last}...`);
		const migration = require(path.join(MIGRATIONS_DIR, last));
		await migration.down(conn);
		await conn.execute('DELETE FROM migrations WHERE name = ?', [last]);
		console.log(`✅ ${last} annulée.`);
	} finally {
		conn.release();
	}
}

async function showStatus() {
	const conn = await pool.getConnection();
	try {
		await ensureMigrationsTable(conn);
		const applied = await getAppliedMigrations(conn);
		const files = await getMigrationFiles();

		console.log('\n📋 État des migrations:\n');
		for (const file of files) {
			const status = applied.has(file) ? '✅ appliquée' : '⏳ en attente';
			console.log(`  ${status}  ${file}`);
		}
		console.log('');
	} finally {
		conn.release();
	}
}

const command = process.argv[2] || 'up';

(async () => {
	try {
		if (command === 'up') await runUp();
		else if (command === 'down') await runDown();
		else if (command === 'status') await showStatus();
		else console.error(`Commande inconnue: ${command}. Utiliser: up | down | status`);
	} catch (err) {
		console.error('❌ Erreur de migration:', err.message);
		process.exit(1);
	} finally {
		await pool.end();
	}
})();
