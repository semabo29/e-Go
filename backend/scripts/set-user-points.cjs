#!/usr/bin/env node
/**
 * Uso: node scripts/set-user-points.cjs <username> <puntos>
 * Ejemplo: node scripts/set-user-points.cjs pau 115999
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { pool, USUARIOS_TABLE } = require('../lib/db');
const { setPoints } = require('../models/userPointsModel');

async function main() {
  const username = (process.argv[2] || '').trim();
  const points = Number(process.argv[3]);
  if (!username || !Number.isFinite(points) || points < 0) {
    console.error('Uso: node scripts/set-user-points.cjs <username> <puntos>');
    process.exit(1);
  }

  const userRes = await pool.query(
    `SELECT id, username FROM ${USUARIOS_TABLE} WHERE LOWER(username) = LOWER($1) ORDER BY id`,
    [username]
  );
  if (!userRes.rows.length) {
    console.error(`Ningún usuario con username: ${username}`);
    process.exit(1);
  }

  const targetPoints = Math.floor(points);
  for (const user of userRes.rows) {
    const updated = await setPoints(user.id, targetPoints);
    console.log(`OK: ${user.username} (id ${user.id}) -> ${updated.points} puntos`);
  }
  console.log(`Total: ${userRes.rows.length} usuario(s) actualizado(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
