const request = require('supertest');
const express = require('express');

jest.mock('../../controllers/userController', () => ({
  getUser: jest.fn((req, res) => res.json({ ok: 'get' })),
  updateUser: jest.fn((req, res) => res.json({ ok: 'put' })),
}));

const userController = require('../../controllers/userController');
const usersRoutes = require('../../routes/users');

const app = express();
app.use(express.json());
app.use('/user', usersRoutes);

describe('routes/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET / delega en userController.getUser', async () => {
    const res = await request(app).get('/user').query({ usuari_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: 'get' });
    expect(userController.getUser).toHaveBeenCalled();
  });

  test('PUT / delega en userController.updateUser', async () => {
    const res = await request(app)
      .put('/user')
      .query({ usuari_id: 1 })
      .send({ username: 'x' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: 'put' });
    expect(userController.updateUser).toHaveBeenCalled();
  });
});
