import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

// Shared account-creation logic, factored out so HR onboarding and
// self-registration don't end up as two separate implementations of
// "hash a password and insert a user."
//
// NOTE FOR BACKEND DEV 1: auth.routes.js's POST /register still has this
// logic inline (didn't touch that file — see the "don't edit" list). The
// clean follow-up is to replace that handler's body with a call to
// createAccount() from here, so there's truly one implementation. Until
// that lands, keep the bcrypt cost factor / email regex / min password
// length in sync by hand if either copy changes.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

export class AccountError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Depends on users.department and users.status — Backend Dev 1's pending
// migration. Until those columns exist this will error on insert; that's
// intentional (fail loud, not silently drop the department).
export async function createAccount({ name, email, password, roleName = 'employee', department = null }) {
  if (!name || !email || !password) {
    throw new AccountError(400, 'name, email, password are required');
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new AccountError(400, 'Please provide a valid email address');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new AccountError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, department, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, name, email, department, status, created_at`,
      [name.trim(), email.trim(), hash, department]
    );
    const newUser = rows[0];

    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = $2`,
      [newUser.id, roleName]
    );

    return newUser;
  } catch (err) {
    if (err.code === '23505') throw new AccountError(409, 'Email already registered');
    throw err;
  }
}
