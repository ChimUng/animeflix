import mongoose, { Schema, models } from 'mongoose';

export interface INotification extends mongoose.Document {
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: 'mention' | 'like' | 'system';
  kind?: 'reply' | 'tag' | null;
  filmId: string;
  episodeNum: number;
  commentId: mongoose.Types.ObjectId | null;
  anchorCommentId: mongoose.Types.ObjectId | null;
  provider?: string | null;
  epId?: string | null;
  subtype?: string | null;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    type: {
      type: String,
      enum: ['mention', 'like', 'system'],
      required: true,
    },
    kind: { type: String, enum: ['reply', 'tag'], default: null },

    filmId: { type: String, required: true },
    episodeNum: { type: Number, required: true },
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    anchorCommentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },

    provider: { type: String, default: null },
    epId: { type: String, default: null },
    subtype: { type: String, default: null },

    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const Notification = models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
