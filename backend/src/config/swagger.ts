import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SyncBoard API Documentation',
    version: '1.0.0',
    description:
      'Production-grade RESTful API specification for the SyncBoard Real-Time Collaborative Task Platform',
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}/api`,
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          avatar: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Board: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          owner: { $ref: '#/components/schemas/User' },
          members: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                role: { type: 'string', enum: ['owner', 'admin', 'member'] },
                joinedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          columns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                order: { type: 'number' },
              },
            },
          },
        },
      },
      Task: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'completed'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          order: { type: 'number' },
          boardId: { type: 'string' },
          creator: { $ref: '#/components/schemas/User' },
          assignee: { $ref: '#/components/schemas/User' },
          dueDate: { type: 'string', format: 'date-time' },
          labels: { type: 'array', items: { type: 'string' } },
          version: { type: 'number' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);

