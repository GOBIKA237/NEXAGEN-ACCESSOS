// Integration tests for auth.routes.js.
//
// These hit a real Postgres database via the same `pool` the app uses
// (DATABASE_URL from .env / .env.test), because db.js exports a live pg
// Pool at module scope and isn't mine to change to support mocking.
// Run against a disposable/dev DB — these tests write and delete rows.
//
// Run with: npm test
// (requires the `supertest` devDependency added alongside this file)

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';

import authRoutes from '../src/routes/auth.routes.js';
import { pool } from '../src/config/db.js';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

const TEST_EMAIL = 'auth-test-user@example.com';
const TEST_PASSWORD = 'correct-horse-battery';

async function cleanupTestUser() {
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [TEST_EMAIL]);
  const userId = rows[0]?.id;
  if (!userId) return;

  // No ON DELETE CASCADE on login_events / audit_logs (see docs/schema.sql),
  // so these have to go first or the users delete violates the FK.
  await pool.query('DELETE FROM login_events WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}

before(async () => {
  await cleanupTestUser();
});

after(async () => {
  await cleanupTestUser();
  await pool.end();
});

test('POST /auth/register with a duplicate email returns 409', async () => {
  const payload = { name: 'Auth Test User', email: TEST_EMAIL, password: TEST_PASSWORD };

  const first = await request(app).post('/auth/register').send(payload);
  assert.equal(first.status, 201);

  const second = await request(app).post('/auth/register').send(payload);
  assert.equal(second.status, 409);
  assert.equal(typeof second.body.error, 'string');
});

test('POST /auth/login with the wrong password returns 401', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({ email: TEST_EMAIL, password: 'definitely-not-the-right-password' });

  assert.equal(res.status, 401);
  assert.equal(typeof res.body.error, 'string');
});
