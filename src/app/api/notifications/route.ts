import { NextRequest, NextResponse } from 'next/server';
import type { FilterQuery, Types } from 'mongoose';
import { getAuthSession } from '@/app/api/auth/[...nextauth]/route';
import { connectMongo } from '@/mongodb/db';
import Notification, { INotification } from '@/mongodb/models/notification';
import User from '@/mongodb/models/users';

// Shape của 1 notification sau .populate('sender', 'name image').lean()
interface LeanNotification extends Omit<INotification, 'sender' | 'recipient'> {
    _id: Types.ObjectId;
    sender: {
        _id: Types.ObjectId;
        name?: string;
        image?: { medium?: string | null; large?: string | null } | null;
    } | null;
}

export async function GET(req: NextRequest) {
    try {
        await connectMongo();
        const session = await getAuthSession();
        if (!session?.user?.name) {
            return NextResponse.json({ items: [], total: 0, unreadCount: 0, hasMore: false }, { status: 401 });
        }

        const currentUser = await User.findOne({ name: session.user.name }).select('_id').lean();
        if (!currentUser) {
            return NextResponse.json({ items: [], total: 0, unreadCount: 0, hasMore: false });
        }

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
        const unreadOnly = searchParams.get('unreadOnly') === '1';

        const query: FilterQuery<INotification> = { recipient: currentUser._id };
        if (unreadOnly) query.isRead = false;

        const [items, total, unreadCount] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('sender', 'name image')
                .lean(),
            Notification.countDocuments(query),
            Notification.countDocuments({ recipient: currentUser._id, isRead: false }),
        ]);

        const formatted = (items as unknown as LeanNotification[]).map((n) => ({
            id: n._id.toString(),
            type: n.type,
            kind: n.kind ?? null,
            message: n.message,
            filmId: n.filmId,
            episodeNum: n.episodeNum,
            commentId: n.commentId ? n.commentId.toString() : null,
            anchorCommentId: n.anchorCommentId
                ? n.anchorCommentId.toString()
                : (n.commentId ? n.commentId.toString() : null),
            provider: n.provider ?? null,
            epId: n.epId ?? null,
            subtype: n.subtype ?? null,
            isRead: n.isRead,
            createdAt: n.createdAt,
            sender: n.sender ? { name: n.sender.name, avatar: n.sender.image?.medium || n.sender.image?.large || '' } : null,
        }));

        return NextResponse.json({
            items: formatted,
            total,
            unreadCount,
            hasMore: page * limit < total,
        });
    } catch (error) {
        console.error('[GET /api/notifications] Error:', error);
        return NextResponse.json({ items: [], total: 0, unreadCount: 0, hasMore: false }, { status: 500 });
    }
}
