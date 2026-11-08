import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { AuthService } from '../src/services/auth.service';
import { BoardService } from '../src/services/board.service';

const app = createApp();

describe('Task CRUD, Filtering & Concurrency Tests', () => {
  let userToken: string;
  let boardId: string;

  beforeEach(async () => {
    const user = await AuthService.register('Task Tester', 'tasktester@syncboard.dev', 'Password123!');
    userToken = user.accessToken;

    const board = await BoardService.createBoard('Task Board', 'Testing Board', user.user.id);
    boardId = board._id.toString();
  });

  it('should create a task in a board column with order 0', async () => {
    const res = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Implement Authentication',
        description: 'Using JWT and cookies',
        status: 'todo',
        priority: 'high',
        labels: ['auth', 'backend'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Implement Authentication');
    expect(res.body.data.order).toBe(0);
    expect(res.body.data.version).toBe(1);
  });

  it('should filter tasks by status and priority', async () => {
    // Create multiple tasks
    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Task 1', status: 'todo', priority: 'low' });

    await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Task 2', status: 'in_progress', priority: 'critical' });

    const filterRes = await request(app)
      .get(`/api/boards/${boardId}/tasks?status=in_progress`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.data).toHaveLength(1);
    expect(filterRes.body.data[0].title).toBe('Task 2');
  });

  it('should move task to another column and maintain correct order', async () => {
    const task1Res = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Task To Move', status: 'todo' });

    const taskId = task1Res.body.data._id;

    const moveRes = await request(app)
      .patch(`/api/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        status: 'completed',
        order: 0,
      });

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.data.status).toBe('completed');
    expect(moveRes.body.data.order).toBe(0);
  });

  it('should detect concurrent update conflicts when version does not match', async () => {
    const taskRes = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Concurrent Target Task', status: 'todo' });

    const taskId = taskRes.body.data._id;

    // Simulate User A successfully updating task (version becomes 2)
    const update1 = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Updated Title by User A', version: 1 });

    expect(update1.status).toBe(200);
    expect(update1.body.data.version).toBe(2);

    // Simulate User B submitting update with stale version 1
    const conflictUpdate = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Conflicting Title by User B', version: 1 });

    expect(conflictUpdate.status).toBe(409);
    expect(conflictUpdate.body.message).toContain('Conflict detected');
  });

  it('should delete a task and reorder the remaining column tasks', async () => {
    const t1 = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Task Order 0', status: 'todo' });

    const t2 = await request(app)
      .post(`/api/boards/${boardId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Task Order 1', status: 'todo' });

    // Delete task 0
    const delRes = await request(app)
      .delete(`/api/tasks/${t1.body.data._id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(delRes.status).toBe(200);

    // Remaining task should now be order 0
    const remainingTasks = await request(app)
      .get(`/api/boards/${boardId}/tasks?status=todo`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(remainingTasks.body.data).toHaveLength(1);
    expect(remainingTasks.body.data[0]._id).toBe(t2.body.data._id);
    expect(remainingTasks.body.data[0].order).toBe(0);
  });
});

