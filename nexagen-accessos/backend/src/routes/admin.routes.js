import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';

// Owned by Backend Dev 2. Follow docs/api-contract.md for exact shapes.
const router = Router();

router.get('/users', requireAuth, checkPermission('manage_users'), async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email FROM users');
  res.json(rows);
});

router.get('/roles', requireAuth, checkPermission('manage_users'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM roles');
  res.json(rows);
});

// TODO: POST/PUT/DELETE /roles, /permissions
// TODO: PUT /users/:id/roles
// TODO: POST /access-requests (any authenticated user, not admin-only)
// TODO: GET/PUT /admin/access-requests
// TODO: GET /admin/audit-logs

export default router;
