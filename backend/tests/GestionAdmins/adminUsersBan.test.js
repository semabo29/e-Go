const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../../models/userModel', () => ({
  findByIdWithBanStatus: jest.fn(),
  listAllUsersForAdmin: jest.fn(),
  setUserBanStatus: jest.fn(),
}));

const { requireAdmin } = require('../../middleware/requireAdmin');
const adminUserController = require('../../controllers/adminUserController');
const userModel = require('../../models/userModel');

const app = express();
app.use(express.json());
app.get('/admin/users', requireAdmin, adminUserController.listUsers);
app.patch('/admin/users/:id/ban', requireAdmin, adminUserController.setUserBan);

describe('Admin users moderation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 1, is_banned: false });
  });

  function authHeader() {
    const token = jwt.sign(
      { sub: 1, email: 'admin@example.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return { Authorization: `Bearer ${token}` };
  }

  test('GET /admin/users -> 200 con lista de usuarios', async () => {
    userModel.listAllUsersForAdmin.mockResolvedValue([
      { id: 11, email: 'a@test.com', username: 'a', is_banned: false },
      { id: 12, email: 'b@test.com', username: 'b', is_banned: true },
    ]);

    const res = await request(app).get('/admin/users').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
  });

  test('PATCH /admin/users/:id/ban -> 200 banea usuario', async () => {
    userModel.setUserBanStatus.mockResolvedValue({
      id: 12,
      email: 'b@test.com',
      username: 'b',
      is_banned: true,
      banned_reason: 'manual',
    });
    const res = await request(app)
      .patch('/admin/users/12/ban')
      .set(authHeader())
      .send({ is_banned: true, reason: 'manual' });

    expect(res.status).toBe(200);
    expect(res.body.user.is_banned).toBe(true);
  });

  test('PATCH /admin/users/:id/ban -> 200 desbanea usuario', async () => {
    userModel.setUserBanStatus.mockResolvedValue({
      id: 12,
      email: 'b@test.com',
      username: 'b',
      is_banned: false,
      banned_reason: null,
    });
    const res = await request(app)
      .patch('/admin/users/12/ban')
      .set(authHeader())
      .send({ is_banned: false });

    expect(res.status).toBe(200);
    expect(res.body.user.is_banned).toBe(false);
  });
});
