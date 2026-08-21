"use client";
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useTitle } from '@/lib/store';
import { useStore } from 'zustand';
import { CommentData } from '@/types/comment';
import { formatRelativeTime } from '@/utils/TimeFunctions';
import { getGlobalRecentCommentsAction } from '@/lib/CommentFunctions';
import { colorFromId } from './colorHash';
import { buildCommentHref } from '@/utils/commentLinks';
import { stripStickerTokens } from '@/lib/commentContent';
import {
  AdminIcon, SwordIcon, FlameIcon, VipBadgeIcon, EpRefreshIcon, LockIcon,
} from '@/lib/SvgIcons';

interface CommentVerticalListProps {
  title?: string;
  limit?: number;
  initialComments?: CommentData[];
  initialSort?: SortOption;
}

type SortOption = 'newest' | 'top';

// ── giữ nguyên map role/badge từ CommentItem để đồng bộ màu chủ đạo ────────
const roleBadge: Record<string, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  boss: { label: 'Boss', color: '#d14836', icon: AdminIcon },
  moderator: { label: 'Mod', color: '#0891b2', icon: SwordIcon },
};

const BADGE_ICON: Record<string, React.FC<{ className?: string }>> = {
  'Fan cứng': FlameIcon,
  'VIP': VipBadgeIcon,
};

function getUsernameClass(role: string): string {
  if (role === 'boss') return 'text-animate-red';
  if (role === 'moderator') return 'text-animate-cyan';
  return 'text-neutral-200';
}

const DEFAULT_LIMIT = 5;

const CommentVerticalList: React.FC<CommentVerticalListProps> = ({
  title = 'Bình luận nổi bật',
  limit = DEFAULT_LIMIT,
  initialComments,
  initialSort = 'newest',
}) => {
  const animetitle = useStore(useTitle, (state) => state.animetitle) as 'romaji' | 'english';
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [comments, setComments] = useState<CommentData[]>(initialComments ?? []);
  const [loading, setLoading] = useState(!initialComments);

  const hasSSRData = useRef(!!initialComments);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current && hasSSRData.current && sort === initialSort) {
      isFirstRun.current = false;
      return;
    }
    isFirstRun.current = false;

    let cancelled = false;
    setLoading(true);
    getGlobalRecentCommentsAction(sort, limit).then((data) => {
      if (!cancelled) {
        setComments(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [sort, limit]);

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div className="px-[10px] mb-[8px] mx-0 mt-0 leading-tight lg:px-[2px] lg:mx-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-6 md:h-8 rounded-md w-[.35rem] md:w-[.3rem] bg-white shrink-0" />
          <h2 className="lg:text-[22px] text-[21px] font-medium text-white truncate">{title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setSort((prev) => (prev === 'newest' ? 'top' : 'newest'))}
          className="bg-[#4d148c] hover:bg-[#5f19ad] text-white px-3 py-1.5 rounded-lg text-xs font-medium border-none outline-none cursor-pointer transition-colors shrink-0"
        >
          {sort === 'newest' ? 'Hot nhất' : 'Top bình luận'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <EpRefreshIcon className="w-6 h-6 animate-spin text-white/60" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-sm text-neutral-500 py-8">Chưa có bình luận nào.</p>
      ) : (
        <div className="w-full flex flex-col gap-2 min-w-0">
          {comments.map((c, index) => {
            const animeTitleText = c.animeTitle?.[animetitle] || c.animeTitle?.romaji || c.animeTitle?.english || '';
            const accent = colorFromId(c.aniId);
            const badge = roleBadge[c.user.role];
            const FilmBadgeIcon = c.user.badge ? BADGE_ICON[c.user.badge] : undefined;
            const href = buildCommentHref(c, c.id);
            const isLocked = c.status === 'flagged' || c.isLocked;

            return (
              <div key={c.id} className="w-full flex items-start gap-2 min-w-0">
                <span
                  className="w-6 shrink-0 text-center text-sm sm:text-base font-bold text-gray-400 mt-2.5"
                  style={index < 3 ? { color: accent } : {}}
                >
                  #{index + 1}
                </span>

                <Link
                  href={href}
                  className="group flex items-start bg-[#18181b] rounded-lg p-2 sm:p-2.5 transition-colors flex-1 min-w-0"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#202024';
                    e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${accent}66`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#18181b';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#d14836] shrink-0 bg-[#333] flex items-center justify-center text-xs font-semibold text-white">
                    {c.user.avatar ? (
                      <img src={c.user.avatar} alt={c.user.name} className="w-full h-full object-cover" />
                    ) : (
                      c.user.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex flex-col min-w-0 flex-1 gap-1 ml-2.5">
                    {/* username + badges — đúng màu/logic từ CommentItem */}
                    <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 min-w-0">
                      <span className={`text-sm font-medium truncate transition-colors ${getUsernameClass(c.user.role)}`}>
                        {c.user.name}
                      </span>
                      {c.episodeNum > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#d148361a] text-[#d14836] font-semibold shrink-0">
                          Tập {c.episodeNum.toString().padStart(2, '0')}
                        </span>
                      )}
                      {badge && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold text-white shrink-0"
                          style={{ backgroundColor: badge.color }}
                        >
                          <badge.icon className="w-2.5 h-2.5" /> {badge.label}
                        </span>
                      )}
                      {c.user.badge && FilmBadgeIcon && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold text-white shrink-0"
                          style={{ backgroundColor: c.user.badgeColor || '#d14836' }}
                        >
                          <FilmBadgeIcon className="w-2.5 h-2.5" /> {c.user.badge}
                        </span>
                      )}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-[#a1a1aa26] text-[#a1a1aa] shrink-0">
                          <LockIcon className="w-2.5 h-2.5" /> Đã khoá
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-500">{formatRelativeTime(c.createdAt)}</span>
                    {isLocked ? (
                      <p className="text-[13px] italic text-neutral-500 flex items-center gap-1">
                        <LockIcon className="w-3 h-3 shrink-0" />
                        Bình luận đã bị khoá do vi phạm quy định cộng đồng.
                      </p>
                    ) : c.isSpoiler ? (
                      <p className="text-[13px] italic text-neutral-400 flex items-center gap-1">
                        ⚠ Nội dung spoiler — bấm để xem trong bình luận
                      </p>
                    ) : (
                      <p className="text-[13px] text-neutral-200 line-clamp-2 break-words">
                        {stripStickerTokens(c.content)}
                        {c.isEdited && (
                          <span className="text-[10px] text-neutral-500 italic ml-1">(đã chỉnh sửa)</span>
                        )}
                      </p>
                    )}
                    {animeTitleText && (
                      <span
                        className="text-xs font-medium truncate transition-colors"
                        style={{ color: accent }}
                      >
                        {animeTitleText}
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommentVerticalList;
