import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let fallbackMongoServer: any = null;

export const connectDB = async (customUri?: string): Promise<typeof mongoose> => {
  const uri = customUri || env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 2500,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error: any) {
    logger.warn(`Primary MongoDB URI unavailable (${error.message}). Initializing local fallback...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      fallbackMongoServer = await MongoMemoryServer.create({
        binary: { systemBinary: '/opt/homebrew/bin/mongod' },
      });
      const fallbackUri = fallbackMongoServer.getUri();
      const conn = await mongoose.connect(fallbackUri, { autoIndex: true });
      logger.info(`Fallback MongoDB Connected: ${fallbackUri}`);
      return conn;
    } catch (fallbackError: any) {
      logger.error(`Critical: MongoDB connection failed: ${fallbackError.message}`);
      throw fallbackError;
    }
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully.');
});

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  if (fallbackMongoServer) {
    await fallbackMongoServer.stop();
  }
  logger.info('MongoDB disconnected cleanly.');
};
