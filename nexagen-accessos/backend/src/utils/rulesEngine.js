import { pool } from '../config/db.js';

export async function scoreLogin({ userId, deviceFingerprint }) {
  let score = 0;

  const { rows: recentFails } = await pool.query(
    `SELECT COUNT(*) FROM login_events
     WHERE user_id = $1 AND success = false AND created_at > NOW() - INTERVAL '2 minutes'`,
    [userId]
  );
  if (parseInt(recentFails[0].count, 10) >= 5) score += 50;

  const { rows: knownDevice } = await pool.query(
    `SELECT 1 FROM login_events WHERE user_id = $1 AND device_fingerprint = $2 LIMIT 1`,
    [userId, deviceFingerprint]
  );
  if (knownDevice.length === 0) score += 30;

  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) score += 20;

  return Math.min(score, 100);
}
