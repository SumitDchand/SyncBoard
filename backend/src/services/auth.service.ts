import { User } from '../models/User.model';
import { RefreshToken } from '../models/RefreshToken.model';
import { ApiError } from '../utils/response';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import mongoose from 'mongoose';

export class AuthService {
  static async register(name: string, email: string, password: string) {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists');
    }

    const user = await User.create({ name, email, password });

    const accessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    const refreshToken = signRefreshToken({ userId: user._id.toString(), email: user.email });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt,
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  }

  static async login(email: string, password: string) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const accessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    const refreshToken = signRefreshToken({ userId: user._id.toString(), email: user.email });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt,
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refreshToken(oldRefreshToken: string) {
    if (!oldRefreshToken) {
      throw new ApiError(401, 'Refresh token required');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(oldRefreshToken);
    } catch {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const tokenDoc = await RefreshToken.findOne({ token: oldRefreshToken });
    if (!tokenDoc) {
      throw new ApiError(401, 'Refresh token not found');
    }

    // Token reuse detection: if already revoked, compromise detected! Revoke all tokens for this user.
    if (tokenDoc.revokedAt) {
      await RefreshToken.updateMany(
        { userId: tokenDoc.userId },
        { revokedAt: new Date() }
      );
      throw new ApiError(403, 'Invalid refresh token state. Please log in again.');
    }

    if (tokenDoc.expiresAt < new Date()) {
      throw new ApiError(401, 'Refresh token has expired');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new ApiError(401, 'User no longer exists');
    }

    // Rotate refresh token
    const newAccessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    const newRefreshToken = signRefreshToken({ userId: user._id.toString(), email: user.email });

    // Revoke old token and link to new one
    tokenDoc.revokedAt = new Date();
    tokenDoc.replacedByToken = newRefreshToken;
    await tokenDoc.save();

    // Create new refresh token doc
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      userId: user._id,
      token: newRefreshToken,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    };
  }

  static async logout(refreshToken?: string) {
    if (refreshToken) {
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { revokedAt: new Date() }
      );
    }
    return true;
  }

  static async getMe(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  }
}

