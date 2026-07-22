import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import rbacRoutes from './routes/rbac.routes.js';
import requestRoutes from './routes/Request.routes.js';

dotenv.config();

const app = express();

// Restrict CORS to our actual frontend origin instead of allowing any origin.
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  })
);
app.use(express.json());

// 5 attempts per minute per IP on the login endpoint, to slow down credential
// stuffing / brute-force attempts. This counts every request (successful or
// failed) toward the limit — good enough for this basic protection.
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5,
  standardHeaders: true, // return RateLimit-* headers
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a minute.' },
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
// rbacRoutes is mounted first because it's the complete implementation
// (role/permission CRUD, PUT /users/:id/roles). adminRoutes only has the
// two GET routes it started with; those are now shadowed by rbacRoutes'
// versions of the same paths. Safe to delete adminRoutes.js once confirmed
// nothing else depends on it — see bug report from smoke testing.
app.use('/api/admin', rbacRoutes);
app.use('/api/admin', adminRoutes);

// Access requests and audit log routes
app.use('/api', requestRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`AccessOS backend running on port ${PORT}`);
});
