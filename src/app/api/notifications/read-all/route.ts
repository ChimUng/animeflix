import { NextResponse } from 'next/server';
import { getAuthSession } from '@/app/api/auth/[...nextauth]/route';
import { connectMongo } from '@/mongodb/db';
import Notification from '@/mongodb/models/notification';
import User from '@/mongodb/models/users';

// (Không đổi) — đánh dấu TOÀN BỘ notification "Bình luận" chưa đọc của user hiện tại
// thành đã đọc. Dùng khi user bấm vào tab "Bình luận" trong dropdown chuông.
export async function POST() {
    try {
        await connectMongo();
        const session = await getAuthSession();
        if (!session?.user?.name) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const currentUser = await User.findOne({ name: session.user.name }).select('_id').lean();
        if (!currentUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        await Notification.updateMany(
            { recipient: currentUser._id, isRead: false },
            { $set: { isRead: true } }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[POST /api/notifications/read-all] Error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
