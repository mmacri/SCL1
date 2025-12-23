import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { getPool, sql } from './db.js';
import { requireAuth, requireAdmin, requirePower } from './auth.js';
import { listGroups, listGroupMembers, findUserByEmail, addUserToGroup } from './graph.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || corsOrigins.length === 0) return cb(null, true);
    return corsOrigins.includes(origin) ? cb(null, true) : cb(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

const easyAuthRequired = (process.env.EASY_AUTH_REQUIRED || '').toLowerCase() === 'true' || process.env.EASY_AUTH_REQUIRED === '1';

app.use((req, res, next) => {
  if (!easyAuthRequired) return next();
  if (req.path === '/api/health' || req.path === '/api/courses') return next();
  return requireAuth(req, res, next);
});

function requireFields(body, fields) {
  const missing = fields.filter((f) => !body[f]);
  if (missing.length > 0) {
    const err = new Error(`Missing required fields: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
}

function generateCertCode(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/courses', async (_req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT CourseCode, CourseName, VersionLabel, IsActive
      FROM Courses
      WHERE IsActive = 1
      ORDER BY CreatedAt DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

app.get('/api/reports/monthly', requireAdmin, async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'month must be 1-12' });
    }
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const pool = await getPool();
    const result = await pool.request()
      .input('startDate', sql.DateTime2, start)
      .input('endDate', sql.DateTime2, end)
      .query(`
        SELECT
          l.FullName,
          l.Email,
          l.RoleSelected,
          c.CourseName,
          e.CycleYear,
          e.Status,
          e.LastStepId,
          e.StartDate,
          e.LastActivity
        FROM Enrollments e
        JOIN Learners l ON e.LearnerId = l.LearnerId
        JOIN Courses c ON e.CourseId = c.CourseId
        WHERE e.StartDate >= @startDate AND e.StartDate < @endDate
        ORDER BY e.StartDate DESC
      `);
    res.json({
      year,
      month,
      count: result.recordset.length,
      records: result.recordset
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/reports/summary', requirePower, async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'month must be 1-12' });
    }
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const pool = await getPool();
    const result = await pool.request()
      .input('startDate', sql.DateTime2, start)
      .input('endDate', sql.DateTime2, end)
      .query(`
        SELECT
          e.Status,
          COUNT(*) AS Count
        FROM Enrollments e
        WHERE e.StartDate >= @startDate AND e.StartDate < @endDate
        GROUP BY e.Status
      `);
    res.json({
      year,
      month,
      totals: result.recordset
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/admin/groups', requireAdmin, async (_req, res, next) => {
  try {
    const adminGroupIds = (process.env.ADMIN_GROUP_IDS || '').split(',').map((v) => v.trim()).filter(Boolean);
    const powerGroupIds = (process.env.POWER_GROUP_IDS || '').split(',').map((v) => v.trim()).filter(Boolean);
    const groups = await listGroups([...new Set([...adminGroupIds, ...powerGroupIds])]);
    res.json(groups);
  } catch (err) {
    next(err);
  }
});

app.get('/api/admin/groups/:id/members', requireAdmin, async (req, res, next) => {
  try {
    const members = await listGroupMembers(req.params.id);
    res.json(members);
  } catch (err) {
    next(err);
  }
});

app.post('/api/admin/groups/:id/members', requireAdmin, async (req, res, next) => {
  try {
    requireFields(req.body, ['email']);
    const user = await findUserByEmail(req.body.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await addUserToGroup(req.params.id, user.id);
    res.status(201).json({ added: true, userId: user.id });
  } catch (err) {
    next(err);
  }
});

app.post('/api/learners', async (req, res, next) => {
  try {
    requireFields(req.body, ['email', 'fullName', 'roleSelected']);
    const { email, fullName, roleSelected } = req.body;
    const pool = await getPool();
    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT LearnerId, Email, FullName, RoleSelected FROM Learners WHERE Email = @email');

    if (existing.recordset.length > 0) {
      await pool.request()
        .input('email', sql.NVarChar, email)
        .input('fullName', sql.NVarChar, fullName)
        .input('roleSelected', sql.NVarChar, roleSelected)
        .query('UPDATE Learners SET FullName = @fullName, RoleSelected = @roleSelected WHERE Email = @email');

      const updated = await pool.request()
        .input('email', sql.NVarChar, email)
        .query('SELECT LearnerId, Email, FullName, RoleSelected FROM Learners WHERE Email = @email');
      return res.json(updated.recordset[0]);
    }

    const inserted = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('fullName', sql.NVarChar, fullName)
      .input('roleSelected', sql.NVarChar, roleSelected)
      .query(`
        INSERT INTO Learners (Email, FullName, RoleSelected)
        OUTPUT inserted.LearnerId, inserted.Email, inserted.FullName, inserted.RoleSelected
        VALUES (@email, @fullName, @roleSelected)
      `);
    return res.status(201).json(inserted.recordset[0]);
  } catch (err) {
    next(err);
  }
});

app.post('/api/enrollments', async (req, res, next) => {
  try {
    requireFields(req.body, ['email', 'courseCode', 'cycleYear']);
    const { email, courseCode, cycleYear } = req.body;
    const pool = await getPool();

    const learner = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT LearnerId FROM Learners WHERE Email = @email');
    if (learner.recordset.length === 0) {
      return res.status(404).json({ error: 'Learner not found' });
    }

    const course = await pool.request()
      .input('courseCode', sql.NVarChar, courseCode)
      .query('SELECT CourseId FROM Courses WHERE CourseCode = @courseCode');
    if (course.recordset.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const learnerId = learner.recordset[0].LearnerId;
    const courseId = course.recordset[0].CourseId;

    const existing = await pool.request()
      .input('learnerId', sql.UniqueIdentifier, learnerId)
      .input('courseId', sql.UniqueIdentifier, courseId)
      .input('cycleYear', sql.Int, cycleYear)
      .query(`
        SELECT EnrollmentId, CourseId, CycleYear, Status, LastStepId, LastActivity
        FROM Enrollments
        WHERE LearnerId = @learnerId AND CourseId = @courseId AND CycleYear = @cycleYear
      `);
    if (existing.recordset.length > 0) {
      return res.json(existing.recordset[0]);
    }

    const inserted = await pool.request()
      .input('learnerId', sql.UniqueIdentifier, learnerId)
      .input('courseId', sql.UniqueIdentifier, courseId)
      .input('cycleYear', sql.Int, cycleYear)
      .query(`
        INSERT INTO Enrollments (LearnerId, CourseId, CycleYear)
        OUTPUT inserted.EnrollmentId, inserted.CourseId, inserted.CycleYear, inserted.Status, inserted.LastStepId, inserted.LastActivity
        VALUES (@learnerId, @courseId, @cycleYear)
      `);
    return res.status(201).json(inserted.recordset[0]);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/enrollments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lastStepId, lastActivity } = req.body;
    if (!lastStepId) {
      return res.status(400).json({ error: 'lastStepId is required' });
    }
    const activity = lastActivity ? new Date(lastActivity) : new Date();
    const pool = await getPool();
    const updated = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('lastStepId', sql.NVarChar, lastStepId)
      .input('lastActivity', sql.DateTime2, activity)
      .query(`
        UPDATE Enrollments
        SET LastStepId = @lastStepId, LastActivity = @lastActivity
        WHERE EnrollmentId = @id;
        SELECT EnrollmentId, LastStepId, LastActivity FROM Enrollments WHERE EnrollmentId = @id;
      `);
    return res.json(updated.recordset[0]);
  } catch (err) {
    next(err);
  }
});

app.post('/api/certificates', async (req, res, next) => {
  try {
    requireFields(req.body, ['enrollmentId', 'completionDate']);
    const { enrollmentId, completionDate } = req.body;
    const completion = new Date(completionDate);
    const pool = await getPool();

    const certSeed = `${enrollmentId}-${completion.toISOString()}`;
    const certCode = generateCertCode(certSeed);

    const inserted = await pool.request()
      .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
      .input('completionDate', sql.DateTime2, completion)
      .input('certCode', sql.NVarChar, certCode)
      .query(`
        INSERT INTO Certificates (EnrollmentId, CompletionDate, CertificateCode)
        OUTPUT inserted.CertificateId, inserted.CertificateCode, inserted.IssuedAt
        VALUES (@enrollmentId, @completionDate, @certCode);
      `);

    await pool.request()
      .input('enrollmentId', sql.UniqueIdentifier, enrollmentId)
      .input('lastActivity', sql.DateTime2, completion)
      .query(`
        UPDATE Enrollments
        SET Status = 'completed', LastActivity = @lastActivity
        WHERE EnrollmentId = @enrollmentId
      `);

    return res.status(201).json({
      certificateId: inserted.recordset[0].CertificateId,
      certificateCode: inserted.recordset[0].CertificateCode,
      issuedAt: inserted.recordset[0].IssuedAt
    });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
