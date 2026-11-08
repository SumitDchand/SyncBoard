import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { AuthService } from '../src/services/auth.service';
import { signAccessToken } from '../src/utils/jwt';

const app = createApp();

describe('Authentication & Security Unit & Integration Tests', () => {
  const testUser = {
    name: 'Test Engineer',
    email: 'test@syncboard.dev',
    password: 'SecurePassword123!',
  };

  it('should register a new user with hashed password and return tokens', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.password).toBeUndefined(); // Never expose passwords
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject registration with duplicate email', async () => {
    await AuthService.register(testUser.name, testUser.email, testUser.password);

    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with invalid email or short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: '123',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('should login an existing user with valid credentials', async () => {
    await AuthService.register(testUser.name, testUser.email, testUser.password);

    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    await AuthService.register(testUser.name, testUser.email, testUser.password);

    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should rotate refresh token and issue new access token', async () => {
    const reg = await AuthService.register(testUser.name, testUser.email, testUser.password);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: reg.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(reg.refreshToken); // Rotated!

    // Using the old refresh token again should be rejected (reuse detection)
    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: reg.refreshToken });

    expect(reuseRes.status).toBe(403);
  });

  it('should access protected /api/auth/me with valid Bearer token', async () => {
    const reg = await AuthService.register(testUser.name, testUser.email, testUser.password);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testUser.email);
  });

  it('should reject access to protected endpoint without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should reject access with invalid or forged token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer forged_token_abc_123');

    expect(res.status).toBe(401);
  });
});

