import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { AuthService } from '../src/services/auth.service';

const app = createApp();

describe('Board Management & Authorization API Tests', () => {
  let user1Token: string;
  let user2Token: string;
  let user2Email: string;

  beforeEach(async () => {
    const user1 = await AuthService.register('Owner User', 'owner@syncboard.dev', 'Password123!');
    const user2 = await AuthService.register('Collab User', 'collab@syncboard.dev', 'Password123!');

    user1Token = user1.accessToken;
    user2Token = user2.accessToken;
    user2Email = user2.user.email;
  });

  it('should create a new board with default columns', async () => {
    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Engineering Sprint 1',
        description: 'First production sprint',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Engineering Sprint 1');
    expect(res.body.data.columns).toHaveLength(4);
    expect(res.body.data.columns.map((c: any) => c.id)).toEqual([
      'todo',
      'in_progress',
      'review',
      'completed',
    ]);
  });

  it('should list all boards where user is owner or member', async () => {
    await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Board Alpha' });

    const res = await request(app)
      .get('/api/boards')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Board Alpha');
  });

  it('should prevent unauthorized users from accessing private boards', async () => {
    const createRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Private Executive Board' });

    const boardId = createRes.body.data._id;

    // User 2 tries to access User 1's board
    const accessRes = await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(accessRes.status).toBe(403);
  });

  it('should allow owner to invite members to the board', async () => {
    const createRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Collaborative Board' });

    const boardId = createRes.body.data._id;

    const inviteRes = await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        email: user2Email,
        role: 'member',
      });

    expect(inviteRes.status).toBe(200);
    expect(inviteRes.body.data.members).toHaveLength(2);

    // Now User 2 should be able to access the board
    const accessRes = await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(accessRes.status).toBe(200);
    expect(accessRes.body.data._id).toBe(boardId);
  });

  it('should only allow owner to delete board', async () => {
    const createRes = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Deletable Board' });

    const boardId = createRes.body.data._id;

    // Add user 2 as member
    await request(app)
      .post(`/api/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ email: user2Email, role: 'admin' });

    // User 2 tries to delete board
    const deleteAttempt = await request(app)
      .delete(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(deleteAttempt.status).toBe(403);

    // Owner deletes board
    const ownerDelete = await request(app)
      .delete(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(ownerDelete.status).toBe(200);
  });
});

