import http from 'http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { initializeSocketIO } from './sockets/socket.server';
import { env } from './config/env';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Create Express App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Socket.IO
    initializeSocketIO(server);

    // 4. Start Listening
    server.listen(env.PORT, () => {
      logger.info(`SyncBoard Backend running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`Health check available at: http://localhost:${env.PORT}/api/health`);
      logger.info(`Swagger API Docs available at: http://localhost:${env.PORT}/api-docs`);
    });

    // 5. Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDB();
        process.exit(0);
      });

      // Force exit after 10s if stuck
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error: any) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

