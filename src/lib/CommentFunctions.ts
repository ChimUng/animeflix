"use server";

import mongoose, { FilterQuery, Types } from 'mongoose';
import { getAuthSession } from '@/app/api/auth/[...nextauth]/route';
import { connectMongo } from "@/mongodb/db";
import { Session } from "next-auth";
import Comment, { IComment } from '@/mongodb/models/comment';
import Reaction from '@/mongodb/models/reaction';
import User from '@/mongodb/models/users';
import { CommentData, ReactionType, AnimeTitleSnapshot, CommentMedia, CommentStatus } from '@/types/comment';
import { trackCommentAndMaybeVerifyFan, getFanBadgeMap } from './FanStarsfuctions';
import { createMentionNotifications } from './NotificationFunctions';

const AUTO_FLAG_REPORT_THRESHOLD = 10;

interface LeanCommentDoc {
    _id: Types.ObjectId | string;
    filmId: string;
    episodeNum: number;
    userId: {
        _id: Types.ObjectId | string;
        name: string;
        image?: { medium?: string | null; large?: string | null } | null;
        role: string;
        badge?: string;
    };
    content: string;
    media?: CommentMedia | null;
    parentId?: Types.ObjectId | string | null;
    replyCount: number;
    likesCount: number;
    dislikesCount: number;
    status: CommentStatus;
    isPinned: boolean;
    isGlobalPinned: boolean;
    reportsCount?: number;
    isSpoiler: boolean;
    isEdited: boolean;
    isDeleted: boolean;
    isLocked: boolean;
    aniId?: number | null;
    animeTitle?: AnimeTitleSnapshot | null;
    provider?: string | null;
    epId?: string | null;
    subtype?: string | null;
    createdAt: Date;
    updatedAt?: Date;
}

// ==========================================
// UTILS
// ==========================================
function formatComment(doc: LeanCommentDoc): CommentData {
    return {
        id: doc._id.toString(),
        filmId: doc.filmId,
        episodeNum: doc.episodeNum,
        user: {
            id: doc.userId._id.toString(),
            name: doc.userId.name,
            avatar: doc.userId.image?.medium || doc.userId.image?.large || '',
            role: doc.userId.role as CommentData['user']['role'],
            badge: doc.userId.badge,
        },
        content: doc.content,
        media: doc.media,
        parentId: doc.parentId ? doc.parentId.toString() : null,
        replyCount: doc.replyCount,
        likesCount: doc.likesCount,
        dislikesCount: doc.dislikesCount,
        myReaction: null,
        status: doc.status,
        isPinned: doc.isPinned,
        isGlobalPinned: doc.isGlobalPinned,
        reportsCount: doc.reportsCount ?? 0,
        isSpoiler: doc.isSpoiler,
        isEdited: doc.isEdited,
        isDeleted: doc.isDeleted,
        isLocked: doc.isLocked,
        // ✅ snapshot phục vụ CommentVerticalList + build href watch/info
        aniId: doc.aniId ?? null,
        animeTitle: doc.animeTitle
            ? { romaji: doc.animeTitle.romaji ?? null, english: doc.animeTitle.english ?? null }
            : null,
        provider: doc.provider ?? null,
        epId: doc.epId ?? null,
        subtype: doc.subtype ?? null,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt?.toISOString(),
    };
}

async function getCurrentUserId(session: Session | null): Promise<Types.ObjectId | null> {
    if (!session?.user?.name) return null;
    const currentUser = await User.findOne({ name: session.user.name })
        .select('_id')
        .lean<{ _id: Types.ObjectId } | null>();
    return currentUser?._id ?? null;
}

async function attachReactionsAndBadges(
    filmId: string,
    items: CommentData[],
    currentUserId: Types.ObjectId | string | null | undefined
) {
    if (items.length === 0) return;

    const userIds = items.map((c) => c.user.id);
    const fanBadgeMap = await getFanBadgeMap(filmId, userIds);

    const commentIds = items.map((c) => c.id);
    let reactionMap = new Map<string, ReactionType>();
    if (currentUserId) {
        const reactions = await Reaction.find({ userId: currentUserId, commentId: { $in: commentIds } }).lean();
        reactionMap = new Map(reactions.map((r) => [r.commentId.toString(), r.type]));
    }

    items.forEach((c) => {
        c.myReaction = reactionMap.get(c.id) || null;
        if (fanBadgeMap.get(c.user.id)) {
            c.user.badge = "Fan cứng";
        }
    });
}

// gom theo filmId để attachReactionsAndBadges tính đúng badge fan cứng
// theo TỪNG phim gốc của mỗi comment (dùng cho các feed trộn nhiều phim: global pinned,
// global recent cho CommentVerticalList)
async function attachReactionsAndBadgesGroupedByFilm(
    items: CommentData[],
    currentUserId: Types.ObjectId | string | null | undefined
) {
    const byFilm = new Map<string, CommentData[]>();
    for (const c of items) {
        if (!byFilm.has(c.filmId)) byFilm.set(c.filmId, []);
        byFilm.get(c.filmId)!.push(c);
    }
    for (const [fId, group] of byFilm) {
        await attachReactionsAndBadges(fId, group, currentUserId);
    }
}

// ==========================================
// 1. TẠO COMMENT
// ==========================================
// metadata snapshot đính kèm lúc tạo comment, phục vụ CommentVerticalList
// (animeTitle) và build href chính xác về đúng tập đang xem (provider/epId/subtype).
// Chỉ truyền provider/epId/subtype khi tạo comment từ watch page.
export interface CommentCreateMeta {
    animeTitle?: AnimeTitleSnapshot | null;
    provider?: string | null;
    epId?: string | null;
    subtype?: string | null;
}

export const createCommentAction = async (
    filmId: string,
    aniId: number,
    episodeNum: number,
    content: string,
    isSpoiler: boolean,
    parentId?: string | null,
    meta?: CommentCreateMeta
): Promise<{ success: boolean; data?: CommentData; error?: string }> => {
    try {
        await connectMongo();
        const session: Session | null = await getAuthSession();

        if (!session?.user?.name) {
            return { success: false, error: 'Unauthorized' };
        }

        const currentUser = await User.findOne({ name: session.user.name }).lean();
        if (!currentUser) return { success: false, error: 'User not found' };

        const userId = currentUser._id;

        if (parentId) {
            const parent = await Comment.findById(parentId)
                .select('isLocked status')
                .lean<{ isLocked: boolean; status: string } | null>();
            if (!parent || parent.status !== 'active' || parent.isLocked) {
                return { success: false, error: 'Bình luận này đã bị khoá, không thể trả lời' };
            }
        }

        const newComment = await Comment.create({
            filmId,
            episodeNum,
            userId: userId,
            content,
            isSpoiler,
            parentId: parentId || null,
            // snapshot phục vụ CommentVerticalList + build href focus watch/info
            aniId: Number.isFinite(aniId) ? aniId : undefined,
            animeTitle: meta?.animeTitle
                ? { romaji: meta.animeTitle.romaji ?? null, english: meta.animeTitle.english ?? null }
                : undefined,
            provider: meta?.provider ?? undefined,
            epId: meta?.epId ?? undefined,
            subtype: meta?.subtype ?? undefined,
        });

        if (parentId) {
            await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
        }

        await trackCommentAndMaybeVerifyFan({
            userId: userId.toString(),
            filmId: filmId,
            aniId: aniId,
            token: (session.user as Session['user'] & { token?: string }).token ?? ''
        });

        await createMentionNotifications({
            senderId: userId.toString(),
            senderName: session.user.name,
            filmId,
            episodeNum,
            commentId: newComment._id.toString(),
            content,
            parentId: parentId || null,
            provider: meta?.provider ?? null,
            epId: meta?.epId ?? null,
            subtype: meta?.subtype ?? null,
        });

        const populatedComment = await Comment.findById(newComment._id).populate('userId').lean();
        return { success: true, data: formatComment(populatedComment as unknown as LeanCommentDoc) };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("Error creating comment:", error);
        return { success: false, error: message };
    }
}

// ==========================================
// 2. LẤY DANH SÁCH COMMENT CHA (cursor-based pagination)
// ==========================================
export interface CommentsCursor {
    createdAt: string;
    likesCount?: number;
}

export const getCommentsAction = async (
    filmId: string,
    episodeNum: number = 0,
    sort: 'newest' | 'top' = 'newest',
    cursor: CommentsCursor | null = null,
    limit: number = 20
) => {
    try {
        await connectMongo();
        const session: Session | null = await getAuthSession();
        const currentUserId = await getCurrentUserId(session);

        // trước đây lọc status: 'active' khiến bình luận bị khoá (flagged)
        // biến mất hoàn toàn khỏi danh sách thay vì hiển thị kèm ổ khoá.
        // Chỉ loại 'hidden' (đã xoá thật sự), giữ lại 'flagged' để còn render UI khoá.
        const query: FilterQuery<IComment> = { filmId, episodeNum, parentId: null, status: { $ne: 'hidden' } };

        // dùng cursor (mốc phần tử cuối cùng đã tải) thay vì skip,
        // để tránh bị lệch/ trùng/ bỏ sót khi có comment bị xoá giữa chừng
        if (cursor) {
            if (sort === 'top') {
                query.$or = [
                    { likesCount: { $lt: cursor.likesCount ?? 0 } },
                    { likesCount: cursor.likesCount ?? 0, createdAt: { $lt: cursor.createdAt } },
                ];
            } else {
                query.createdAt = { $lt: cursor.createdAt };
            }
        }

        const sortCondition: Record<string, 1 | -1> =
            sort === 'top' ? { likesCount: -1, createdAt: -1 } : { createdAt: -1 };

        const comments = await Comment.find(query)
            .sort(sortCondition)
            .limit(limit)
            .populate('userId', 'name image role badge')
            .lean();

        const formattedComments = comments.map((c) => formatComment(c as unknown as LeanCommentDoc));
        await attachReactionsAndBadges(filmId, formattedComments, currentUserId);

        return formattedComments;
    } catch (error) {
        console.error("Error fetching comments:", error);
        return [];
    }
}

// ==========================================
// 2b. ĐẾM TỔNG SỐ COMMENT (kể cả reply)
// ==========================================
export const getTotalCommentCountAction = async (
    filmId: string,
    episodeNum: number = 0
): Promise<number> => {
    try {
        await connectMongo();
        // đồng bộ với getCommentsAction — chỉ loại 'hidden', không loại 'flagged'
        return await Comment.countDocuments({ filmId, episodeNum, status: { $ne: 'hidden' } });
    } catch (error) {
        console.error("Error counting comments:", error);
        return 0;
    }
}

// ==========================================
// 2c. LẤY CÁC BÌNH LUẬN ĐANG GHIM TOÀN SERVER
// (không lọc theo filmId — phải hiện ở MỌI trang phim. filmId của các comment này
// vẫn giữ nguyên "nơi đăng gốc", chỉ có isGlobalPinned=true là cờ điều khiển việc
// merge vào MỌI trang, KHÔNG cần đổi filmId — xem giải thích buildCommentHref)
// ==========================================
export const getGlobalPinnedCommentsAction = async (): Promise<CommentData[]> => {
    try {
        await connectMongo();
        const session: Session | null = await getAuthSession();
        const currentUserId = await getCurrentUserId(session);

        const comments = await Comment.find({ isGlobalPinned: true, status: 'active' })
            .sort({ updatedAt: -1 })
            .populate('userId', 'name image role badge')
            .lean();

        const formatted = comments.map((c) => formatComment(c as unknown as LeanCommentDoc));
        // gom theo từng filmId để badge fan cứng tính đúng theo phim gốc của comment đó
        await attachReactionsAndBadgesGroupedByFilm(formatted, currentUserId);

        return formatted;
    } catch (error) {
        console.error("Error fetching global pinned comments:", error);
        return [];
    }
}

// ==========================================
// 2d. FEED BÌNH LUẬN TOÀN SITE (cho CommentVerticalList)
// Chỉ lấy comment GỐC (parentId: null) — vì reply chỉ có 1 cấp và luôn được hiển
// thị lồng dưới comment cha trong CommentSection, nên feed dạng "tin nổi bật"
// không cần/không nên hiện riêng lẻ 1 reply mất ngữ cảnh.
// ==========================================
export const getGlobalRecentCommentsAction = async (
    sort: 'newest' | 'top' = 'newest',
    limit: number = 5
): Promise<CommentData[]> => {
    try {
        await connectMongo();
        const session: Session | null = await getAuthSession();
        const currentUserId = await getCurrentUserId(session);

        const sortCondition: Record<string, 1 | -1> =
            sort === 'top' ? { likesCount: -1, createdAt: -1 } : { createdAt: -1 };

        const comments = await Comment.find({ status: 'active', isDeleted: false, parentId: null })
            .sort(sortCondition)
            .limit(limit)
            .populate('userId', 'name image role badge')
            .lean();

        const formatted = comments.map((c) => formatComment(c as unknown as LeanCommentDoc));
        await attachReactionsAndBadgesGroupedByFilm(formatted, currentUserId);

        return formatted;
    } catch (error) {
        console.error("Error fetching global recent comments:", error);
        return [];
    }
}

// ==========================================
// 3. LẤY DANH SÁCH TRẢ LỜI (REPLIES)
// ==========================================
export const getRepliesAction = async (parentId: string, filmId: string) => {
    try {
        await connectMongo();
        const session: Session | null = await getAuthSession();
        const currentUserId = await getCurrentUserId(session);

        // chỉ loại 'hidden' (đã xoá), giữ lại 'flagged' (đã khoá) để hiển thị kèm ổ khoá
        const replies = await Comment.find({ parentId, status: { $ne: 'hidden' } })
            .sort({ createdAt: 1 })
            .populate('userId', 'name image role badge')
            .lean();

        const formattedReplies = replies.map((r) => formatComment(r as unknown as LeanCommentDoc));
        await attachReactionsAndBadges(filmId, formattedReplies, currentUserId);

        return formattedReplies;
    } catch (error) {
        console.error("Error fetching replies:", error);
        return [];
    }
}

// ==========================================
// 4. REACTION (LIKE/DISLIKE)
// ==========================================
export const voteCommentAction = async (commentId: string, type: ReactionType) => {
    try {
        await connectMongo();
        const session: Session | null = await getAuthSession();
        if (!session?.user?.name) return { success: false, error: 'Unauthorized' };

        // chặn vote nếu bình luận đã bị khoá/xoá, phòng trường hợp
        // client bị bypass (ví dụ gọi thẳng action qua devtools)
        const target = await Comment.findById(commentId)
            .select('isLocked status')
            .lean<{ isLocked: boolean; status: string } | null>();
        if (!target || target.isLocked || target.status !== 'active') {
            return { success: false, error: 'Bình luận đã bị khoá, không thể tương tác' };
        }

        const currentUser = await User.findOne({ name: session.user.name })
            .select('_id')
            .lean<{ _id: Types.ObjectId } | null>();
        if (!currentUser) return { success: false };

        const userId = currentUser._id;
        const existingReaction = await Reaction.findOne({ commentId, userId });

        if (existingReaction) {
            if (existingReaction.type === type) {
                await Reaction.deleteOne({ _id: existingReaction._id });
                const incField = type === 'like' ? { likesCount: -1 } : { dislikesCount: -1 };
                await Comment.findByIdAndUpdate(commentId, { $inc: incField });
            } else {
                existingReaction.type = type;
                await existingReaction.save();
                const incFields = type === 'like' ? { likesCount: 1, dislikesCount: -1 } : { likesCount: -1, dislikesCount: 1 };
                await Comment.findByIdAndUpdate(commentId, { $inc: incFields });
            }
        } else {
            await Reaction.create({ commentId, userId, type });
            const incField = type === 'like' ? { likesCount: 1 } : { dislikesCount: 1 };
            await Comment.findByIdAndUpdate(commentId, { $inc: incField });
        }

        return { success: true };
    } catch (error) {
        console.error("Error voting:", error);
        return { success: false };
    }
}

// ==========================================
// 5. BÁO CÁO (REPORT)
// - Mỗi user chỉ báo cáo được 1 lần / bình luận (chống spam)
// - Chưa đăng nhập không báo cáo được
// - Đủ AUTO_FLAG_REPORT_THRESHOLD user khác nhau báo cáo -> tự động status = 'flagged'
// ==========================================
export const reportCommentAction = async (commentId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await connectMongo();
        const session: Session | null = await getAuthSession();
        if (!session?.user?.name) return { success: false, error: 'Unauthorized' };

        const currentUser = await User.findOne({ name: session.user.name })
            .select('_id')
            .lean<{ _id: Types.ObjectId } | null>();
        if (!currentUser) return { success: false, error: 'User not found' };

        // ⚠️ .lean<T>() tường minh — nếu không, TS coi comment.reports/status là "không tồn tại"
        // do union type Model<IComment> | Model<any> của Comment model (xem models/comment.ts)
        const comment = await Comment.findById(commentId)
            .select('reports status')
            .lean<{ reports: Types.ObjectId[]; status: string } | null>();
        if (!comment) return { success: false, error: 'Không tìm thấy bình luận' };

        const alreadyReported = comment.reports.some(
            (r: Types.ObjectId) => r.toString() === currentUser._id.toString()
        );
        if (alreadyReported) {
            return { success: false, error: 'Bạn đã báo cáo bình luận này rồi' };
        }

        const updated = await Comment.findByIdAndUpdate(
            commentId,
            { $addToSet: { reports: currentUser._id }, $inc: { reportsCount: 1 } },
            { new: true }
        )
            .select('reports status')
            .lean<{ reports: Types.ObjectId[]; status: string } | null>();

        if (updated && updated.reports.length >= AUTO_FLAG_REPORT_THRESHOLD && updated.status === 'active') {
            await Comment.findByIdAndUpdate(commentId, { status: 'flagged', isLocked: true });
        }

        return { success: true };
    } catch (error) {
        console.error("Error reporting comment:", error);
        return { success: false, error: 'Server error' };
    }
}

// ==========================================
// 6. QUYỀN ADMIN
// ==========================================
async function requireRole(allowedRoles: ('boss' | 'moderator')[]) {
    const session: Session | null = await getAuthSession();
    if (!session?.user?.name) return null;

    const currentUser = await User.findOne({ name: session.user.name })
        .select('role')
        .lean<{ _id: Types.ObjectId; role: string } | null>();
    if (!currentUser || !allowedRoles.includes(currentUser.role as 'boss' | 'moderator')) return null;

    return currentUser;
}

export const pinCommentAction = async (commentId: string, pin: boolean) => {
    try {
        await connectMongo();
        const admin = await requireRole(['boss', 'moderator']);
        if (!admin) return { success: false, error: 'Forbidden' };

        await Comment.findByIdAndUpdate(commentId, { isPinned: pin }); // chỉ true/false, không track ai ghim
        return { success: true };
    } catch (error) {
        console.error("Error pinning comment:", error);
        return { success: false, error: 'Server error' };
    }
};

export const pinGlobalCommentAction = async (commentId: string, pin: boolean) => {
    try {
        await connectMongo();
        const admin = await requireRole(['boss']); // chỉ Boss được ghim toàn server
        if (!admin) return { success: false, error: 'Forbidden' };

        await Comment.findByIdAndUpdate(commentId, { isGlobalPinned: pin });
        return { success: true };
    } catch (error) {
        console.error("Error global-pinning comment:", error);
        return { success: false, error: 'Server error' };
    }
};

// Khoá bình luận (admin) -> status chuyển sang 'flagged', mở khoá -> trở lại 'active'
export const lockCommentAction = async (commentId: string, lock: boolean) => {
    try {
        await connectMongo();
        const admin = await requireRole(['boss', 'moderator']);
        if (!admin) return { success: false, error: 'Forbidden' };

        await Comment.findByIdAndUpdate(commentId, {
            isLocked: lock,
            status: lock ? 'flagged' : 'active',
        });
        return { success: true };
    } catch (error) {
        console.error("Error locking comment:", error);
        return { success: false, error: 'Server error' };
    }
};

// Admin xoá bình luận bất kỳ — cascade xoá luôn các reply con (isDeleted/hidden)
export const adminDeleteCommentAction = async (commentId: string): Promise<{ success: boolean; error?: string; cascaded?: number }> => {
    try {
        await connectMongo();
        const admin = await requireRole(['boss', 'moderator']);
        if (!admin) return { success: false, error: 'Forbidden' };

        const replyIds = await Comment.find({ parentId: commentId, status: { $ne: 'hidden' } }).distinct('_id');
        await Comment.updateMany(
            { _id: { $in: [commentId, ...replyIds] } },
            { isDeleted: true, status: 'hidden' }
        );

        return { success: true, cascaded: replyIds.length };
    } catch (error) {
        console.error("Error deleting comment:", error);
        return { success: false, error: 'Server error' };
    }
};

// User tự xoá comment CỦA CHÍNH MÌNH — cascade xoá luôn reply con của nó
export const deleteOwnCommentAction = async (commentId: string): Promise<{ success: boolean; error?: string; cascaded?: number }> => {
    try {
        await connectMongo();
        const session: Session | null = await getAuthSession();
        if (!session?.user?.name) return { success: false, error: 'Unauthorized' };

        const currentUser = await User.findOne({ name: session.user.name })
            .select('_id')
            .lean<{ _id: Types.ObjectId } | null>();
        if (!currentUser) return { success: false };

        const comment = await Comment.findById(commentId)
            .select('userId')
            .lean<{ userId: Types.ObjectId } | null>();
        if (!comment || comment.userId.toString() !== currentUser._id.toString()) {
            return { success: false, error: 'Forbidden' };
        }

        // tương tự adminDeleteCommentAction — cascade cả reply đang 'flagged'
        const replyIds = await Comment.find({ parentId: commentId, status: { $ne: 'hidden' } }).distinct('_id');
        await Comment.updateMany(
            { _id: { $in: [commentId, ...replyIds] } },
            { isDeleted: true, status: 'hidden', content: '' }
        );

        return { success: true, cascaded: replyIds.length };
    } catch (error) {
        console.error("Error deleting own comment:", error);
        return { success: false, error: 'Server error' };
    }
};

// User tự SỬA bình luận của chính mình
export const editOwnCommentAction = async (
    commentId: string,
    content: string
): Promise<{ success: boolean; error?: string; content?: string }> => {
    try {
        const trimmed = content.trim();
        if (!trimmed) return { success: false, error: 'Nội dung không được để trống' };

        await connectMongo();
        const session: Session | null = await getAuthSession();
        if (!session?.user?.name) return { success: false, error: 'Unauthorized' };

        const currentUser = await User.findOne({ name: session.user.name })
            .select('_id')
            .lean<{ _id: Types.ObjectId } | null>();
        if (!currentUser) return { success: false };

        const comment = await Comment.findById(commentId)
            .select('userId isLocked status')
            .lean<{ userId: Types.ObjectId; isLocked: boolean; status: string } | null>();
        if (!comment || comment.userId.toString() !== currentUser._id.toString()) {
            return { success: false, error: 'Forbidden' };
        }
        if (comment.isLocked || comment.status !== 'active') {
            return { success: false, error: 'Bình luận đã bị khoá, không thể chỉnh sửa' };
        }

        await Comment.findByIdAndUpdate(commentId, { content: trimmed, isEdited: true });
        return { success: true, content: trimmed };
    } catch (error) {
        console.error("Error editing comment:", error);
        return { success: false, error: 'Server error' };
    }
};

// ==========================================
// 7. NGƯỜI TƯƠNG TÁC (LIKE/DISLIKE) — cho modal "Xem người tương tác"
// Dùng aggregation ($lookup + $facet) để JOIN sang collection `users`,
// SORT theo tên (a-z) và PHÂN TRANG ngay ở tầng DB — tránh phải load hết
// reactions vào bộ nhớ rồi tự sort/cắt trang bằng JS (không scale khi
// 1 comment có hàng nghìn reaction).
// ==========================================
export const getCommentReactorsAction = async (
    commentId: string,
    type: ReactionType,
    page: number = 1,
    pageSize: number = 20
): Promise<{ items: { id: string; name: string; avatar: string }[]; total: number; hasMore: boolean }> => {
    try {
        await connectMongo();
        const skip = (page - 1) * pageSize;

        interface ReactorAggregateItem {
            id: Types.ObjectId;
            name: string;
            avatar?: string;
        }
        interface ReactorAggregateResult {
            items?: ReactorAggregateItem[];
            totalCount?: { count: number }[];
        }

        const [result] = await Reaction.aggregate<ReactorAggregateResult>([
            { $match: { commentId: new mongoose.Types.ObjectId(commentId), type } },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
                $facet: {
                    items: [
                        { $sort: { 'user.name': 1 } }, // a-z
                        { $skip: skip },
                        { $limit: pageSize },
                        { $project: { _id: 0, id: '$user._id', name: '$user.name', avatar: '$user.image.medium' } },
                    ],
                    totalCount: [{ $count: 'count' }],
                },
            },
        ]);

        const total = result?.totalCount?.[0]?.count ?? 0;
        const items = (result?.items ?? []).map((u) => ({
            id: u.id.toString(),
            name: u.name,
            avatar: u.avatar || '',
        }));

        return { items, total, hasMore: skip + items.length < total };
    } catch (error) {
        console.error("Error fetching comment reactors:", error);
        return { items: [], total: 0, hasMore: false };
    }
};
