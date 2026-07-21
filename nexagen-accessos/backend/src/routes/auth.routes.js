import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, password are required' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, hash]
    );

    // Assign default 'employee' role
    const { rows: roleRows } = await pool.query(
      `SELECT id FROM roles WHERE name = 'employee'`
    );
    if (roleRows.length === 0) {
      // Shouldn't happen since schema.sql seeds this role, but fail loudly if it's missing
      console.error("Default role 'employee' not found in roles table");
    } else {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [rows[0].id, roleRows[0].id]
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // TODO: call rules engine here to score this login (new device / odd hour)
    // and insert into login_events before issuing the token.

    // Roles assigned to this user
    const { rows: roleRows } = await pool.query(
      `SELECT r.name
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [user.id]
    );
    const roles = roleRows.map((r) => r.name);

    // Combined, deduped permissions across all of the user's roles
    const { rows: permRows } = await pool.query(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN user_roles ur ON ur.role_id = rp.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );
    const permissions = permRows.map((p) => p.name);

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, roles, permissions },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(rows[0]);
});

export default router;
