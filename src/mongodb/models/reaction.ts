import mongoose, { Schema, models, Document } from 'mongoose';
import { BaseReaction } from '@/types/comment';

export interface IReaction extends BaseReaction, Document {
  commentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema<IReaction>(
  {
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'dislike'], required: true },
  },
  { timestamps: true }
);

ReactionSchema.index({ commentId: 1, userId: 1 }, { unique: true });

const Reaction = models.Reaction || mongoose.model<IReaction>('Reaction', ReactionSchema);
export default Reaction;