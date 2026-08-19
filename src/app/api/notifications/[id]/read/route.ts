import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/app/api/auth/[...nextauth]/route';
import { connectMongo } from '@/mongodb/db';
import Notification from '@/mongodb/models/notification';
import User from '@/mongodb/models/users';

// (Không đổi) — đánh dấu đã đọc 1 notification cụ thể. Chỉ cho phép recipient của
// chính notification đó thao tác.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

        const result = await Notification.updateOne(
            { _id: params.id, recipient: currentUser._id },
            { $set: { isRead: true } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[POST /api/notifications/[id]/read] Error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
