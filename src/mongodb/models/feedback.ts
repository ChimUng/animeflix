import { Schema, model, models, Document } from 'mongoose';

// 1. Định nghĩa Interface cho Feedback Document
export interface IFeedback extends Document {
    title: string;
    description: string;
    type: 'Bug Report' | 'Feature Request' | 'Suggestion' | 'Other';
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    createdAt: Date;
}

// 2. Tạo Schema từ Interface
const FeedbackSchema = new Schema<IFeedback>({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['Bug Report', 'Feature Request', 'Suggestion', 'Other'],
        default: 'Suggestion',
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Low',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// 3. Xuất model
const Feedback = models.Feedback || model<IFeedback>('Feedback', FeedbackSchema);

export default Feedback;