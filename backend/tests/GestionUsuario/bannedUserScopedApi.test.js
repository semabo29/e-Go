const request = require('supertest');
const express = require('express');

jest.mock('../../models/userModel', () => ({
  findByIdWithBanStatus: jest.fn(),
}));

jest.mock('../../services/favoriteService', () => ({
  getUserFavorites: jest.fn().mockResolvedValue([]),
  addFavorite: jest.fn().mockResolvedValue(undefined),
  removeFavorite: jest.fn().mockResolvedValue(undefined),
}));

const userModel = require('../../models/userModel');
const favoriteRoutes = require('../../routes/favorits');

const app = express();
app.use(express.json());
app.use('/favorites', favoriteRoutes);

describe('API con usuari_id y usuario baneado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /favorites -> 403 si usuari_id esta baneado', async () => {
    userModel.findByIdWithBanStatus.mockResolvedValue({
      id: 5,
      is_banned: true,
      banned_reason: 'Incumplimiento de normas',
    });

    const res = await request(app).get('/favorites').query({ usuari_id: 5 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('USER_BANNED');
    expect(res.body.error).toMatch(/baneada/i);
    expect(res.body.banned_reason).toBe('Incumplimiento de normas');
  });

  test('GET /favorites -> 200 si usuari_id no esta baneado', async () => {
    userModel.findByIdWithBanStatus.mockResolvedValue({ id: 5, is_banned: false });

    const res = await request(app).get('/favorites').query({ usuari_id: 5 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
