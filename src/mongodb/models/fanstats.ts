import mongoose, { Schema, models, Document } from 'mongoose';
import { BaseFanStats } from '@/types/comment';

export interface IFilmFanStats extends BaseFanStats, Document {
  userId: mongoose.Types.ObjectId; 
  createdAt: Date;
  updatedAt: Date;
}

const FilmFanStatsSchema = new Schema<IFilmFanStats>(
  {
    filmId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    commentCount: { type: Number, default: 0 },

    isInAniListList: { type: Boolean, default: false },
    listCheckedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

FilmFanStatsSchema.index({ filmId: 1, commentCount: -1 });
FilmFanStatsSchema.index({ filmId: 1, userId: 1 }, { unique: true });

const FilmFanStats = models.FilmFanStats || mongoose.model<IFilmFanStats>('FilmFanStats', FilmFanStatsSchema);
export default FilmFanStats;