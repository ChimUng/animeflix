import { Schema, model, models, Document } from 'mongoose';

// 1. Định nghĩa Interface (Kiểu dữ liệu) cho Watch Document
// Interface này sẽ được sử dụng trong toàn bộ ứng dụng của bạn (bao gồm cả file EpHistory)
// để đảm bảo mọi đối tượng 'Watch' đều có cấu trúc giống nhau.
export interface IWatch extends Document {
    userName: string;
    aniId: string;
    aniTitle?: string | null;
    epTitle?: string | null;
    image?: string | null;
    epId?: string | null;
    epNum: number;
    timeWatched?: number | null;
    duration?: number | null;
    provider?: string | null;
    nextepId?: string | null;
    nextepNum?: number | null;
    subtype?: 'sub' | 'dub' | string; // Có thể giới hạn là 'sub' | 'dub' để an toàn hơn
    createdAt: Date;
}

// 2. Tạo Schema từ Interface
// Bằng cách truyền <IWatch> vào, Mongoose sẽ đảm bảo schema này tuân thủ theo interface đã định nghĩa.
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

// 3. Xuất model
// Đoạn code này kiểm tra xem model 'Watch' đã tồn tại chưa để tránh lỗi trong môi trường Next.js (hot-reloading)
const watch = models.Watch || model<IWatch>('Watch', WatchSchema);

export default watch;