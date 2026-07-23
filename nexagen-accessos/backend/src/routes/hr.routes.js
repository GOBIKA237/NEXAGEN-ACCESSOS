import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';
import { createAccount, AccountError } from '../utils/accountService.js';

// Owned by Backend Dev 3 (HR + Finance + alerts follow-ups).
const router = Router();

// Separation of duties: HR manages employee profiles and status, but must
// never get 'manage_users' — that's role/permission admin territory, owned
// by rbac.routes.js. Two permissions:
//   - view_hr_dashboard    (already seeded, granted to 'hr' role) — reads
//   - manage_hr_employees  (NEW — see SQL note below) — onboarding/edits/status
//
// Until manage_hr_employees exists and is granted to 'hr', every write route
// below will 403 for hr users. SQL for Backend Dev 1's migration:
//
//   INSERT INTO permissions (name, description) VALUES
//     ('manage_hr_employees', 'Onboard, edit, and (de)activate employee records');
//   INSERT INTO role_permissions (role_id, permission_id)
//   SELECT r.id, p.id FROM roles r, permissions p
//   WHERE r.name = 'hr' AND p.name = 'manage_hr_employees';

const READ_PERMISSION = 'view_hr_dashboard';
const WRITE_PERMISSION = 'manage_hr_employees';

// GET /api/hr/employees?search=&department=&status=&role=&page=&limit=
router.get('/employees', requireAuth, checkPermission(READ_PERMISSION), async (req, res) => {
  const { search, department, status, role } = req.query;
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (department) {
    params.push(department);
    conditions.push(`u.department = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`u.status = $${params.length}`);
  }
  if (role) {
    // Filtered via a subquery rather than the joined `r.name` column directly —
    // filtering the outer join on r.name would also collapse the roles[]
    // array below down to just the matched role, hiding any other roles the
    // user has.
    params.push(role);
    conditions.push(`u.id IN (
      SELECT ur2.user_id FROM user_roles ur2
      JOIN roles r2 ON r2.id = ur2.role_id
      WHERE r2.name = $${params.length}
    )`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.department, u.status, u.created_at,
              COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.name
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching HR directory:', err);
    res.status(500).json({ error: 'Failed to fetch employee directory' });
  }
});

// POST /api/hr/employees — onboard. Reuses createAccount() (same bcrypt
// hashing / validation as auth.routes.js's register) instead of a second
// account-creation path. Always assigns the base 'employee' role — HR
// grants additional roles via rbac.routes.js like anyone else, not here.
router.post('/employees', requireAuth, checkPermission(WRITE_PERMISSION), async (req, res) => {
  const { name, email, password, department } = req.body;

  try {
    const newUser = await createAccount({
      name,
      email,
      password,
      roleName: 'employee',
      department: department || null,
    });
    res.status(201).json(newUser);
  } catch (err) {
    if (err instanceof AccountError) return res.status(err.status).json({ error: err.message });
    console.error('Error onboarding employee:', err);
    res.status(500).json({ error: 'Failed to onboard employee' });
  }
});

// PUT /api/hr/employees/:id — edit profile fields. Whitelisted on purpose:
// email/password changes stay with the account owner / auth flow, not HR.
const EDITABLE_FIELDS = ['name', 'department', 'manager_id'];

router.put('/employees/:id', requireAuth, checkPermission(WRITE_PERMISSION), async (req, res) => {
  const { id } = req.params;
  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const keys = Object.keys(updates);
  if (keys.length === 0) {
    return res.status(400).json({ error: `No editable fields provided (allowed: ${EDITABLE_FIELDS.join(', ')})` });
  }

  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
  const values = keys.map((key) => updates[key]);
  values.push(id);

  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${values.length}
       RETURNING id, name, email, department, status, manager_id, created_at`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'manager_id does not reference a valid user' });
    }
    console.error('Error updating employee:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// PUT /api/hr/employees/:id/status — activate/deactivate.
//
// IMPORTANT: this alone does NOT stop a deactivated user's *existing* JWT
// from working — requireAuth doesn't check users.status today (see the
// team note in this PR). As a belt-and-suspenders measure this also stamps
// tokens_invalid_before on deactivation, reusing the same mechanism
// alerts.routes.js's invalidate-session uses, so that once requireAuth
// enforces tokens_invalid_before (proposed patch, pending), deactivation
// takes effect immediately instead of only blocking future logins.
const VALID_STATUSES = ['active', 'inactive'];

router.put('/employees/:id/status', requireAuth, checkPermission(WRITE_PERMISSION), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE users SET status = $1 WHERE id = $2
       RETURNING id, name, email, status`,
      [status, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

    if (status === 'inactive') {
      await pool.query(`UPDATE users SET tokens_invalid_before = NOW() WHERE id = $1`, [id]);
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, status === 'active' ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED', `user:${id}`, req.ip]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating employee status:', err);
    res.status(500).json({ error: 'Failed to update employee status' });
  }
});

export default router;
