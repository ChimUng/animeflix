"use server";

import { Types } from 'mongoose';
import Notification from '@/mongodb/models/notification';
import User from '@/mongodb/models/users';
import Comment from '@/mongodb/models/comment';

function extractMentionedNames(content: string): string[] {
  const matches = content.match(/@([a-zA-Z0-9_]+)/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1))));
}

export interface NewCommentNotifyParams {
  senderId: string;
  senderName: string;
  filmId: string;
  episodeNum: number;
  commentId: string;
  content: string;
  parentId?: string | null;
  provider?: string | null;
  epId?: string | null;
  subtype?: string | null;
}

/**
 * GỌI NGAY SAU KHI TẠO COMMENT/REPLY THÀNH CÔNG (trong createCommentAction).
 *
 * Tạo tối đa 1 notification / user nhận, dù người đó vừa là chủ comment cha
 * (kind='reply') vừa bị @tên trong chính reply đó (kind='tag') — ưu tiên
 * 'reply' vì nó cụ thể + đúng ngữ cảnh hơn.
 *
 * Không throw lỗi ra ngoài — 1 notification tạo lỗi không được phép làm
 * fail toàn bộ luồng tạo comment (comment đã lưu DB thành công rồi).
 */
export async function createMentionNotifications(params: NewCommentNotifyParams) {
  const {
    senderId, senderName, filmId, episodeNum, commentId, content, parentId,
    provider, epId, subtype,
  } = params;

  const anchorCommentId = parentId || commentId;

  try {
    const recipients = new Map<string, 'reply' | 'tag'>();

    // reply -> chủ bình luận cha
    if (parentId) {
      const parent = await Comment.findById(parentId)
        .select('userId')
        .lean<{ userId: Types.ObjectId } | null>();
      if (parent && String(parent.userId) !== senderId) {
        recipients.set(String(parent.userId), 'reply');
      }
    }

    // @mention -> tra User theo tên, loại chính mình + người đã có trong map
    const names = extractMentionedNames(content);
    if (names.length > 0) {
      const users = await User.find({ name: { $in: names } }).select('_id').lean();
      for (const u of users) {
        const id = String(u._id);
        if (id !== senderId && !recipients.has(id)) {
          recipients.set(id, 'tag');
        }
      }
    }

    if (recipients.size === 0) return;

    const docs = Array.from(recipients.entries()).map(([recipientId, kind]) => ({
      recipient: recipientId,
      sender: senderId,
      type: 'mention' as const,
      kind,
      filmId,
      episodeNum,
      commentId,
      anchorCommentId,
      provider: provider ?? null,
      epId: epId ?? null,
      subtype: subtype ?? null,
      message:
        kind === 'reply'
          ? `${senderName} đã trả lời bình luận của bạn`
          : `${senderName} đã nhắc đến bạn trong một bình luận`,
    }));

    await Notification.insertMany(docs);
  } catch (error) {
    console.error('[createMentionNotifications] Lỗi tạo notification:', error);
  }
}
