const express = require('express');
const request = require('supertest');

jest.mock('../../models/userModel', () => ({
  findByIdWithBanStatus: jest.fn(),
}));

const userModel = require('../../models/userModel');
const { ensureUserNotBanned, respondIfBannedUserId } = require('../../middleware/requireNotBanned');

function buildApp(handler) {
  const app = express();
  app.get('/check/:id', async (req, res) => {
    const banned = await respondIfBannedUserId(res, req.params.id);
    if (banned) return;
    return res.json({ ok: true });
  });
  app.get('/ensure/:id', async (req, res) => {
    const result = await ensureUserNotBanned(Number(req.params.id));
    return res.status(result.ok ? 200 : result.status).json(result);
  });
  return app;
}

describe('requireNotBanned', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureUserNotBanned', () => {
    test('-> ok si usuario activo', async () => {
      userModel.findByIdWithBanStatus.mockResolvedValue({ id: 1, is_banned: false });
      const result = await ensureUserNotBanned(1);
      expect(result).toEqual({ ok: true });
    });

    test('-> 401 si usuario no existe', async () => {
      userModel.findByIdWithBanStatus.mockResolvedValue(null);
      const result = await ensureUserNotBanned(99);
      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
    });

    test('-> 403 si usuario baneado', async () => {
      userModel.findByIdWithBanStatus.mockResolvedValue({
        id: 2,
        is_banned: true,
        banned_reason: 'spam',
      });
      const result = await ensureUserNotBanned(2);
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.banned_reason).toBe('spam');
    });
  });

  describe('respondIfBannedUserId', () => {
    const app = buildApp();

    test('-> no responde si id invalido', async () => {
      const res = await request(app).get('/check/abc');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('-> no responde si usuario no existe', async () => {
      userModel.findByIdWithBanStatus.mockResolvedValue(null);
      const res = await request(app).get('/check/5');
      expect(res.status).toBe(200);
    });

    test('-> no responde si usuario no baneado', async () => {
      userModel.findByIdWithBanStatus.mockResolvedValue({ id: 5, is_banned: false });
      const res = await request(app).get('/check/5');
      expect(res.status).toBe(200);
    });

    test('-> 403 USER_BANNED si baneado', async () => {
      userModel.findByIdWithBanStatus.mockResolvedValue({
        id: 5,
        is_banned: true,
        banned_reason: 'abuso',
      });
      const res = await request(app).get('/check/5');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('USER_BANNED');
      expect(res.body.banned_reason).toBe('abuso');
    });
  });
});
