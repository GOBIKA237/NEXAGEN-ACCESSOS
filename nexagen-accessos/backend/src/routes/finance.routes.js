import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';

// Owned by Backend Dev 3.
const router = Router();

// view_finance_dashboard (existing, seeded) covers every read route below.
// Approve/reject is a distinct, more sensitive action, so it gets its own
// permission rather than piggybacking on view — see SQL note below.
const READ_PERMISSION = 'view_finance_dashboard';
const APPROVE_PERMISSION = 'manage_finance_expenses';

// GET /api/finance/budgets — spent/remaining computed from approved expenses,
// never stored redundantly.
router.get('/budgets', requireAuth, checkPermission(READ_PERMISSION), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.category, b.allocated,
              COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'approved'), 0) AS spent,
              b.allocated - COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'approved'), 0) AS remaining
       FROM budgets b
       LEFT JOIN expenses e ON e.category = b.category
       GROUP BY b.id, b.category, b.allocated
       ORDER BY b.category`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching budgets:', err);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET /api/finance/expenses?status=&category=&submittedBy=&from=&to=&page=&limit=
router.get('/expenses', requireAuth, checkPermission(READ_PERMISSION), async (req, res) => {
  const { status, category, submittedBy, from, to } = req.query;
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (status) { params.push(status); conditions.push(`e.status = $${params.length}`); }
  if (category) { params.push(category); conditions.push(`e.category = $${params.length}`); }
  if (submittedBy) { params.push(submittedBy); conditions.push(`e.submitted_by = $${params.length}`); }
  if (from) { params.push(from); conditions.push(`e.expense_date >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`e.expense_date <= $${params.length}`); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.title, e.category, e.submitted_by, u.name AS submitted_by_name,
              e.amount, e.expense_date, e.status, e.reviewed_by, e.reviewed_at, e.created_at
       FROM expenses e
       JOIN users u ON u.id = e.submitted_by
       ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// POST /api/finance/expenses
router.post('/expenses', requireAuth, checkPermission(READ_PERMISSION), async (req, res) => {
  const { title, category, amount, date } = req.body;

  if (!title || !category || amount === undefined || !date) {
    return res.status(400).json({ error: 'title, category, amount, and date are required' });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  // submitted_by always comes from the authenticated user's JWT, never
  // trusted from the request body — otherwise anyone could file an expense
  // under someone else's name.
  const submittedBy = req.user.id;

  try {
    const { rows } = await pool.query(
      `INSERT INTO expenses (title, category, submitted_by, amount, expense_date, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, title, category, submitted_by, amount, expense_date, status, created_at`,
      [title, category, submittedBy, numericAmount, date]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Unknown budget category' });
    console.error('Error submitting expense:', err);
    res.status(500).json({ error: 'Failed to submit expense' });
  }
});

// PUT /api/finance/expenses/:id — approve/reject.
const VALID_EXPENSE_STATUSES = ['approved', 'rejected'];

router.put('/expenses/:id', requireAuth, checkPermission(APPROVE_PERMISSION), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_EXPENSE_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_EXPENSE_STATUSES.join(', ')}` });
  }

  try {
    // WHERE status = 'pending' doubles as an optimistic lock — two
    // reviewers can't both approve/reject the same expense.
    const { rows } = await pool.query(
      `UPDATE expenses
       SET status = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING id, title, category, submitted_by, amount, expense_date, status, reviewed_by, reviewed_at`,
      [status, req.user.id, id]
    );

    if (rows.length === 0) {
      const { rows: existing } = await pool.query('SELECT id, status FROM expenses WHERE id = $1', [id]);
      if (existing.length === 0) return res.status(404).json({ error: 'Expense not found' });
      return res.status(409).json({ error: `Expense already ${existing[0].status}` });
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, status === 'approved' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED', `expense:${id}`, req.ip]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('Error reviewing expense:', err);
    res.status(500).json({ error: 'Failed to review expense' });
  }
});

// GET /api/finance/reports — everything computed live from budgets/expenses.
router.get('/reports', requireAuth, checkPermission(READ_PERMISSION), async (req, res) => {
  try {
    const [budgetSummary, expenseSummary, monthlySummary] = await Promise.all([
      pool.query(
        `SELECT b.category, b.allocated,
                COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'approved'), 0) AS spent,
                b.allocated - COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'approved'), 0) AS remaining
         FROM budgets b
         LEFT JOIN expenses e ON e.category = b.category
         GROUP BY b.id, b.category, b.allocated
         ORDER BY b.category`
      ),
      pool.query(
        `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
         FROM expenses
         GROUP BY status`
      ),
      pool.query(
        `SELECT to_char(date_trunc('month', expense_date), 'YYYY-MM') AS month,
                COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) AS approved_total,
                COUNT(*)::int AS expense_count
         FROM expenses
         GROUP BY date_trunc('month', expense_date)
         ORDER BY date_trunc('month', expense_date) DESC
         LIMIT 12`
      ),
    ]);

    res.json({
      budgetSummary: budgetSummary.rows,
      expenseSummary: expenseSummary.rows,
      monthlySummary: monthlySummary.rows,
    });
  } catch (err) {
    console.error('Error building finance reports:', err);
    res.status(500).json({ error: 'Failed to build finance reports' });
  }
});

export default router;
