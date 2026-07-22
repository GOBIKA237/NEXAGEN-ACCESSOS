import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';
import { explainRiskSignals } from '../utils/rulesEngine.js';

// Owned by Lead, alongside rulesEngine.js.
const router = Router();

// A login only counts as an "alert" once at least one real signal fired.
// The three signals are worth 50 / 30 / 20, so 50 is the lowest score that
// guarantees something meaningful tripped (either the failed-attempts burst
// on its own, or the two weaker signals — unrecognized device + off-hours —
// together). Anything below that is either noise or unreachable given the
// current weights. Tunable via ?minScore= if that turns out too strict/loose
// for the demo data.
const DEFAULT_MIN_SCORE = 50;

// GET /admin/alerts?minScore=&page=&limit=
// requireAuth + checkPermission('manage_users'), same as every other admin route.
router.get(
  '/admin/alerts',
  requireAuth,
  checkPermission('manage_users'),
  async (req, res) => {
    const minScore = req.query.minScore !== undefined
      ? parseInt(req.query.minScore, 10)
      : DEFAULT_MIN_SCORE;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    if (Number.isNaN(minScore)) {
      return res.status(400).json({ error: 'minScore must be a number' });
    }

    try {
      // login_events grows on every login attempt, so this is scored,
      // filtered, ordered, and paginated in the DB rather than pulling
      // everything back and slicing in JS.
      const { rows } = await pool.query(
        `SELECT id, user_id, device_fingerprint, risk_score, created_at
         FROM login_events
         WHERE risk_score >= $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [minScore, limit, offset]
      );

      // Reasons aren't stored anywhere — scoreLogin() only ever wrote the
      // number — so they're recomputed per row from the event's own data.
      const alerts = await Promise.all(
        rows.map(async (row) => {
          const reasons = await explainRiskSignals({
            id: row.id,
            userId: row.user_id,
            deviceFingerprint: row.device_fingerprint,
            createdAt: row.created_at,
          });

          return {
            id: row.id,
            userId: row.user_id,
            riskScore: row.risk_score,
            reason: reasons.length > 0 ? reasons.join('; ') : 'elevated risk score',
            createdAt: row.created_at,
          };
        })
      );

      return res.json(alerts);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      return res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  }
);

export default router;
