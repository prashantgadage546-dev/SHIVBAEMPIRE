// =============================================================
// SHIVBAEMPIRE — Backend API Tests
// =============================================================
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const request = require('supertest');
const app = require('../../src/index');

let authToken = '';
let createdDonorId = null;
let createdCollectionId = null;
let createdEventId = null;

describe('SHIVBAEMPIRE API Tests', () => {

  // ---- Health Check ----
  describe('GET /api/health', () => {
    it('should return status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.app).toBe('SHIVBAEMPIRE');
    });
  });

  // ---- Authentication ----
  describe('POST /api/auth/login', () => {
    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'wrongpass' });
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should login with valid admin credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin@123' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.role).toBe('ADMIN');
      authToken = res.body.token;
    });

    it('should reject missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.statusCode).toBe(400);
    });
  });

  // ---- Auth Me ----
  describe('GET /api/auth/me', () => {
    it('should return current user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.user.username).toBe('admin');
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });
  });

  // ---- Events ----
  describe('Events API', () => {
    it('should list events', async () => {
      const res = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        createdEventId = res.body.data[0].id;
      }
    });

    it('should create an event', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Event 2026', status: 'UPCOMING' });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      createdEventId = res.body.data.id;
    });
  });

  // ---- Donors ----
  describe('Donors API', () => {
    it('should list donors', async () => {
      const res = await request(app)
        .get('/api/donors')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a donor', async () => {
      if (!createdEventId) return;
      const res = await request(app)
        .post('/api/donors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          full_name: 'Test Donor Jest',
          mobile: '9000000001',
          village_name: 'Test Village',
          expected_donation: 5000,
          event_id: createdEventId,
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      createdDonorId = res.body.data.id;
    });

    it('should detect duplicate mobile for same event', async () => {
      if (!createdEventId) return;
      const res = await request(app)
        .post('/api/donors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          full_name: 'Duplicate Donor',
          mobile: '9000000001',
          expected_donation: 3000,
          event_id: createdEventId,
        });
      expect(res.statusCode).toBe(409);
      expect(res.body.isDuplicate).toBe(true);
    });

    it('should get donor by id', async () => {
      if (!createdDonorId) return;
      const res = await request(app)
        .get(`/api/donors/${createdDonorId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.mobile).toBe('9000000001');
    });

    it('should reject invalid mobile', async () => {
      if (!createdEventId) return;
      const res = await request(app)
        .post('/api/donors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ full_name: 'Bad Donor', mobile: '123', event_id: createdEventId });
      expect(res.statusCode).toBe(400);
    });
  });

  // ---- Collections ----
  describe('Collections API', () => {
    it('should list collections', async () => {
      const res = await request(app)
        .get('/api/collections')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('should create a collection with receipt', async () => {
      if (!createdDonorId || !createdEventId) return;
      const res = await request(app)
        .post('/api/collections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          donor_id: createdDonorId,
          event_id: createdEventId,
          amount: 2000,
          payment_mode: 'CASH',
          collection_date: new Date().toISOString().split('T')[0],
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receipt_number).toBeTruthy();
      createdCollectionId = res.body.data.id;
    });

    it('should reject negative amount', async () => {
      if (!createdDonorId || !createdEventId) return;
      const res = await request(app)
        .post('/api/collections')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ donor_id: createdDonorId, event_id: createdEventId, amount: -100, payment_mode: 'CASH', collection_date: '2026-01-01' });
      expect(res.statusCode).toBe(400);
    });
  });

  // ---- Receipts ----
  describe('Receipts API', () => {
    it('should list receipts', async () => {
      const res = await request(app)
        .get('/api/receipts')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('should verify a receipt publicly', async () => {
      // Get a receipt number from the DB
      const listRes = await request(app)
        .get('/api/receipts?limit=1')
        .set('Authorization', `Bearer ${authToken}`);
      if (listRes.body.data.length > 0) {
        const rn = listRes.body.data[0].receipt_number;
        const res = await request(app).get(`/api/receipts/verify/${rn}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data.isValid).toBe(true);
      }
    });

    it('should return 404 for invalid receipt', async () => {
      const res = await request(app).get('/api/receipts/verify/INVALID-RECEIPT-999');
      expect(res.statusCode).toBe(404);
    });
  });

  // ---- Expenses ----
  describe('Expenses API', () => {
    it('should list expenses', async () => {
      const res = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('should create an expense', async () => {
      if (!createdEventId) return;
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          event_id: createdEventId,
          category: 'MISCELLANEOUS',
          description: 'Test expense',
          amount: 1000,
          payment_mode: 'CASH',
          expense_date: new Date().toISOString().split('T')[0],
        });
      expect(res.statusCode).toBe(201);
    });
  });

  // ---- Reports / Dashboard ----
  describe('Reports API', () => {
    it('should return dashboard data', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('totalCollection');
      expect(res.body.data).toHaveProperty('totalExpenses');
      expect(res.body.data).toHaveProperty('remainingBalance');
    });

    it('should return village-wise report', async () => {
      const res = await request(app)
        .get('/api/reports/village-wise')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ---- Cleanup ----
  afterAll(async () => {
    if (createdCollectionId) {
      await request(app)
        .delete(`/api/collections/${createdCollectionId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
    if (createdDonorId) {
      await request(app)
        .delete(`/api/donors/${createdDonorId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
    if (createdEventId) {
      await request(app)
        .delete(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
  });
});
