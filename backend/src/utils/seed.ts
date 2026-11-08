import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Board } from '../models/Board.model';
import { Task } from '../models/Task.model';
import { logger } from './logger';

export const seedDatabase = async () => {
  try {
    logger.info('Connecting to database for seeding...');
    await connectDB();

    logger.info('Clearing existing data...');
    await User.deleteMany({});
    await Board.deleteMany({});
    await Task.deleteMany({});

    logger.info('Creating demo users...');
    const user1 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@syncboard.dev',
      password: 'Password123!',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    });

    const user2 = await User.create({
      name: 'Bob Smith',
      email: 'bob@syncboard.dev',
      password: 'Password123!',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    });

    const user3 = await User.create({
      name: 'Carol Davis',
      email: 'carol@syncboard.dev',
      password: 'Password123!',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    });

    logger.info('Creating demo boards...');
    const board1 = await Board.create({
      title: 'SyncBoard Product Launch',
      description: 'Q4 Product Roadmap and Engineering Sprint Board',
      owner: user1._id,
      members: [
        { user: user1._id, role: 'owner', joinedAt: new Date() },
        { user: user2._id, role: 'admin', joinedAt: new Date() },
        { user: user3._id, role: 'member', joinedAt: new Date() },
      ],
    });

    const board2 = await Board.create({
      title: 'DevOps & Infrastructure',
      description: 'Kubernetes migration, CI/CD pipelines, and observability',
      owner: user2._id,
      members: [
        { user: user2._id, role: 'owner', joinedAt: new Date() },
        { user: user1._id, role: 'member', joinedAt: new Date() },
      ],
    });

    logger.info('Creating demo tasks...');
    await Task.create([
      {
        title: 'Architect Real-Time WebSocket Engine',
        description: 'Design room partitioning and event broadcasting with latency telemetry.',
        status: 'completed',
        priority: 'critical',
        order: 0,
        boardId: board1._id,
        creator: user1._id,
        assignee: user1._id,
        dueDate: new Date(Date.now() + 86400000 * 2),
        labels: ['Backend', 'WebSocket', 'Architecture'],
      },
      {
        title: 'Implement JWT Refresh Token Rotation',
        description: 'Store token families in MongoDB with replay detection and automatic invalidation.',
        status: 'completed',
        priority: 'high',
        order: 1,
        boardId: board1._id,
        creator: user1._id,
        assignee: user2._id,
        dueDate: new Date(Date.now() + 86400000 * 3),
        labels: ['Security', 'Auth'],
      },
      {
        title: 'Design Kanban Drag-and-Drop UX',
        description: 'Build smooth cross-column reordering using Tailwind and Lucide icons.',
        status: 'in_progress',
        priority: 'high',
        order: 0,
        boardId: board1._id,
        creator: user2._id,
        assignee: user3._id,
        dueDate: new Date(Date.now() + 86400000 * 4),
        labels: ['Frontend', 'UI/UX'],
      },
      {
        title: 'Sub-100ms Latency Benchmark Validation',
        description: 'Execute automated multi-client benchmark measuring P50, P95, and P99 propagation delay.',
        status: 'in_progress',
        priority: 'critical',
        order: 1,
        boardId: board1._id,
        creator: user1._id,
        assignee: user1._id,
        dueDate: new Date(Date.now() + 86400000 * 1),
        labels: ['Performance', 'QA'],
      },
      {
        title: 'Conduct Security Audit and OWASP Top 10 Review',
        description: 'Inspect input sanitization, rate limits, CORS, and query injection prevention.',
        status: 'review',
        priority: 'medium',
        order: 0,
        boardId: board1._id,
        creator: user3._id,
        assignee: user2._id,
        dueDate: new Date(Date.now() + 86400000 * 5),
        labels: ['Security', 'Audit'],
      },
      {
        title: 'Deploy to Staging Environment on Render & Atlas',
        description: 'Configure environment secrets, health checks, and verify zero-downtime deployment.',
        status: 'todo',
        priority: 'low',
        order: 0,
        boardId: board1._id,
        creator: user1._id,
        assignee: user2._id,
        dueDate: new Date(Date.now() + 86400000 * 7),
        labels: ['DevOps', 'Deployment'],
      },
    ]);

    logger.info('Database seeded successfully!');
    logger.info('Demo Credentials:');
    logger.info('  User 1: alice@syncboard.dev / Password123!');
    logger.info('  User 2: bob@syncboard.dev / Password123!');
    logger.info('  User 3: carol@syncboard.dev / Password123!');

    await disconnectDB();
  } catch (err: any) {
    logger.error('Database seeding failed:', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

