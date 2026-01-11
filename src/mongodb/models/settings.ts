import { Schema, model, models, Document } from 'mongoose';

// 1. Định nghĩa Interface cho Settings Document
export interface ISettings extends Document {
    userId: Schema.Types.ObjectId;
    autoplay: boolean;
    autoskip: boolean;
    autonext: boolean;
    load: 'idle' | 'visible' | 'eager';
    audio: boolean;
    herotrailer: boolean;
}

// 2. Tạo Schema từ Interface
const SettingsSchema = new Schema<ISettings>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    autoplay: {
        type: Boolean,
        default: false,
    },
    autoskip: {
        type: Boolean,
        default: false,
    },
    autonext: {
        type: Boolean,
        default: false,
    },
    load: {
        type: String,
        enum: ['idle', 'visible', 'eager'],
        default: 'idle',
    },
    audio: {
        type: Boolean,
        default: false,
    },
    herotrailer: {
        type: Boolean,
        default: false,
    },
});

// 3. Xuất model
const Settings = models.Settings || model<ISettings>('Settings', SettingsSchema);

export default Settings;