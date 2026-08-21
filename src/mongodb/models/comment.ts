import mongoose, { Schema, models, Document } from 'mongoose';
import { BaseComment } from '@/types/comment';

export interface IComment extends BaseComment, Document {
  userId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId | null;
  reports: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    filmId: { type: String, default: "homepage", index: true },
    episodeNum: { type: Number, default: 0 },

    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, trim: true, default: "" },

    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },

    replyCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    dislikesCount: { type: Number, default: 0 },

    reports: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reportsCount: { type: Number, default: 0, index: true },
  
    status: { type: String, enum: ['active', 'hidden', 'flagged'], default: 'active', index: true },
    isPinned: { type: Boolean, default: false },
    isGlobalPinned: { type: Boolean, default: false },
    isSpoiler: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },

    aniId: { type: Number, index: true },
    animeTitle: {
      romaji: { type: String, default: null },
      english: { type: String, default: null },
    },

    provider: { type: String, default: null },
    epId: { type: String, default: null },
    subtype: { type: String, default: null },
  },
  { timestamps: true }
);

CommentSchema.path('content').validate(function (value: string) {
  return value.length > 0;
}, 'Bình luận không được để trống!');

CommentSchema.index({ filmId: 1, episodeNum: 1, parentId: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1, createdAt: 1 });
CommentSchema.index({ userId: 1, filmId: 1 });
CommentSchema.index({ status: 1, isDeleted: 1, parentId: 1, createdAt: -1 });
CommentSchema.index({ status: 1, isDeleted: 1, parentId: 1, likesCount: -1, createdAt: -1 });

const Comment = models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
export default Comment;
