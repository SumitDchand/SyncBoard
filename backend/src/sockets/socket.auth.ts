import { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User.model';
import { logger } from '../utils/logger';

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization
        ? socket.handshake.headers.authorization.replace('Bearer ', '')
        : null);

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return next(new Error('Authentication error: Invalid or expired token'));
    }

    const user = await User.findById(decoded.userId).select('name email avatar');
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Attach user to socket session
    socket.data.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    logger.debug(`Socket authenticated for user: ${user.name} (${socket.id})`);
    next();
  } catch (error: any) {
    logger.error('Socket authentication error:', error.message);
    next(new Error('Internal socket authentication error'));
  }
};

