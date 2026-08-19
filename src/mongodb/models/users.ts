import mongoose, { Schema, models, Document, Model } from 'mongoose';
import { BaseUser } from '@/types/comment';

export interface IUser extends BaseUser, Document {
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String },
    email: { type: String },
    image: { type: Schema.Types.Mixed },

    role: { type: String, enum: ['user', 'moderator', 'boss'], default: 'user' },
    badge: { type: String, default: "" },
    isBanned: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'users'
  }
);

const User = (models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
export default User;