import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';

const router = Router();

router.get('/users', requireAuth, checkPermission('manage_users'), async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email FROM users');
  res.json(rows);
});

router.get('/roles', requireAuth, checkPermission('manage_users'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM roles');
  res.json(rows);
});

// PUT /users/:id/roles — body { roleIds: [1,2] }, replace user's roles in user_roles
router.put('/users/:id/roles', requireAuth, checkPermission('manage_users'), async (req, res) => {
  const { id } = req.params;
  const { roleIds } = req.body;

  if (!Array.isArray(roleIds)) {
    return res.status(400).json({ error: 'roleIds must be an array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

    for (const roleId of roleIds) {
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [id, roleId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /users/:id/roles error', err);
    return res.status(500).json({ error: 'Internal error updating user roles' });
  } finally {
    client.release();
  }

  const { rows } = await pool.query(
    `SELECT r.* FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [id]
  );

  res.json({ id: Number(id), roles: rows });
});

// POST /roles — body { name, description }
router.post('/roles', requireAuth, checkPermission('manage_users'), async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
      [name, description ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    console.error('POST /roles error', err);
    res.status(500).json({ error: 'Internal error creating role' });
  }
});

// PUT /roles/:id — body { name?, description?, permissionIds? }
router.put('/roles/:id', requireAuth, checkPermission('manage_users'), async (req, res) => {
  const { id } = req.params;
  const { name, description, permissionIds } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE roles
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *`,
      [name ?? null, description ?? null, id]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Role not found' });
    }

    if (Array.isArray(permissionIds)) {
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

      for (const permissionId of permissionIds) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [id, permissionId]
        );
      }
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /roles/:id error', err);
    res.status(500).json({ error: 'Internal error updating role' });
  } finally {
    client.release();
  }
});

// DELETE /roles/:id
router.delete('/roles/:id', requireAuth, checkPermission('manage_users'), async (req, res) => {
  const { id } = req.params;

  const { rows } = await pool.query('DELETE FROM roles WHERE id = $1 RETURNING id', [id]);

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Role not found' });
  }

  res.status(204).send();
});

// GET /permissions
router.get('/permissions', requireAuth, checkPermission('manage_users'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM permissions');
  res.json(rows);
});

// POST /permissions — body { name, description }
router.post('/permissions', requireAuth, checkPermission('manage_users'), async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO permissions (name, description) VALUES ($1, $2) RETURNING *',
      [name, description ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Permission name already exists' });
    }
    console.error('POST /permissions error', err);
    res.status(500).json({ error: 'Internal error creating permission' });
  }
});

export default router;
