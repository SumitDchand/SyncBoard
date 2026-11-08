import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByToken?: string;
  createdAt: Date;
  isExpired: boolean;
  isActive: boolean;
}

const RefreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index auto-deletes expired documents
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

RefreshTokenSchema.virtual('isExpired').get(function (this: IRefreshTokenDocument) {
  return Date.now() >= this.expiresAt.getTime();
});

RefreshTokenSchema.virtual('isActive').get(function (this: IRefreshTokenDocument) {
  return !this.revokedAt && !this.isExpired;
});

export const RefreshToken = mongoose.model<IRefreshTokenDocument>('RefreshToken', RefreshTokenSchema);

