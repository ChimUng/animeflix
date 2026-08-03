import { Schema, model, models, Document } from 'mongoose';
import { WatchData } from '@/types/watch';

export interface IWatch extends WatchData, Document {}

const WatchSchema = new Schema<IWatch>({
    userName: {
        type: String,
        required: true,
    },
    aniId: {
        type: String,
        required: true,
    },
    aniTitle: {
        type: String,
        default: null,
    },
    epTitle: {
        type: String,
        default: null,
    },
    image: {
        type: String,
        default: null,
    },
    epId: {
        type: String,
        default: null,
    },
    epNum: {
        type: Number,
        required: true,
    },
    timeWatched: {
        type: Number,
        default: null,
    },
    duration: {
        type: Number,
        default: null,
    },
    provider: {
        type: String,
        default: null,
    },
    nextepId: {
        type: String,
        default: null,
    },
    nextepNum: {
        type: Number,
        default: null,
    },
    subtype: {
        type: String,
        default: "sub",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const watch = models.Watch || model<IWatch>('Watch', WatchSchema);

export default watch;