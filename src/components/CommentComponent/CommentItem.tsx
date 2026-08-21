"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { Spinner, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/react";
import { toast } from 'sonner';
import type { Session } from 'next-auth';
import { CommentData, ReactionType } from '@/types/comment';
import { formatRelativeTime } from '@/utils/TimeFunctions';
import CommentInput from './CommentInput';
import ReactorsModal from './ReactorsModal';
import {
    LikeIcon, DislikeIcon, ReplyIcon, KebabIcon,
    ViewInteractionsIcon, FlagReportIcon, AiringFlameIcon,
    VipBadgeIcon, FlameIcon, AdminIcon, SwordIcon,
    LockIcon, EditIcon, PinIcon, GlobeIcon, TrashIcon
} from '@/lib/SvgIcons';
import CommentRichText from './CommentRichText';
import { stripStickerTokens } from '@/lib/commentContent';
import styles from '../../styles/CommentSection.module.css';

interface Props {
    comment: CommentData;
    session: Session | null;
    isReply?: boolean;
    onVote: (commentId: string, type: ReactionType) => void;
    onLoadReplies?: (commentId: string) => Promise<CommentData[]>;
    onReplySubmit?: (parentId: string, content: string, isSpoiler: boolean) => Promise<CommentData | false>;
    onReport?: (commentId: string) => Promise<boolean>;
    onOpenLogin?: () => void;
    onPin?: (commentId: string, pin: boolean) => Promise<boolean>;
    onPinGlobal?: (commentId: string, pin: boolean) => Promise<boolean>;
    onLock?: (commentId: string, lock: boolean) => Promise<boolean>;
    onAdminDelete?: (commentId: string) => Promise<boolean>;
    onDeleteOwn?: (commentId: string) => Promise<boolean>;
    onEditOwn?: (commentId: string, content: string) => Promise<boolean>;
}

const roleBadge: Record<string, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
    boss: { label: 'Boss', color: '#d14836', icon: AdminIcon },
    moderator: { label: 'Mod', color: '#0891b2', icon: SwordIcon },
};

const BADGE_ICON: Record<string, React.FC<{ className?: string }>> = {
    'Fan cứng': FlameIcon,
    'VIP': VipBadgeIcon,
};

// chỉ 2 trạng thái pin — không track ai ghim
type PinType = 'global' | 'normal' | null;
function getPinType(c: CommentData): PinType {
    if (c.isGlobalPinned) return 'global';
    if (c.isPinned) return 'normal';
    return null;
}
const PIN_TEXT_CLASS: Record<'global' | 'normal', string> = {
    global: 'text-animate-red',
    normal: 'text-animate-green',
};
const PIN_ICON_COLOR: Record<'global' | 'normal', string> = {
    global: '#ef4444',
    normal: '#22c55e',
};
const PIN_LABEL: Record<'global' | 'normal', string> = {
    global: 'Tin quan trọng toàn server',
    normal: 'Bình luận nổi bật',
};
const PIN_CARD_CLASS: Record<'global' | 'normal', string> = {
    global: styles.pinGlobal,
    normal: styles.pinNormal,
};

function getUsernameClass(role: string): string {
    if (role === 'boss') return 'text-animate-red';
    if (role === 'moderator') return 'text-animate-cyan';
    return styles.usernameUser;
}

function CommentItem({
    comment, session, isReply, onVote, onLoadReplies, onReplySubmit, onReport, onOpenLogin,
    onPin, onPinGlobal, onLock, onAdminDelete, onDeleteOwn, onEditOwn,
}: Props) {
    const [likes, setLikes] = useState(comment.likesCount);
    const [dislikes, setDislikes] = useState(comment.dislikesCount);
    const [myReaction, setMyReaction] = useState<ReactionType | null | undefined>(comment.myReaction);
    const [repliesOpen, setRepliesOpen] = useState(false);
    const [replies, setReplies] = useState<CommentData[]>([]);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [replyBoxOpen, setReplyBoxOpen] = useState(false);
    const [replyCount, setReplyCount] = useState(comment.replyCount);
    const [revealed, setRevealed] = useState(false);
    const [reactorsOpen, setReactorsOpen] = useState(false);

    // trạng thái sửa bình luận + nội dung hiển thị cục bộ (cập nhật ngay khi sửa thành công)
    const [editing, setEditing] = useState(false);
    const [displayContent, setDisplayContent] = useState(comment.content);
    const [displayEdited, setDisplayEdited] = useState(comment.isEdited);

    // trạng thái pin/lock cục bộ — cho phép comment (kể cả reply) tự phản ánh
    // thay đổi ngay khi chính nó (không phải comment cha) bị pin/lock/pinGlobal
    const [isPinned, setIsPinned] = useState(comment.isPinned);
    const [isGlobalPinned, setIsGlobalPinned] = useState(comment.isGlobalPinned);
    const [isLocked, setIsLocked] = useState(comment.isLocked);
    const [status, setStatus] = useState(comment.status);

    const isFlagged = status === 'flagged' || isLocked;
    const replyMentionPrefill = `@${comment.user.name} `;

    const handleVote = (type: ReactionType) => {
        if (isFlagged) {
            toast.error("Bình luận đã bị khoá, không thể tương tác");
            return;
        }
        if (!session?.user?.token) {
            toast.error("Vui lòng đăng nhập để tương tác");
            onOpenLogin?.();
            return;
        }
        const prev = myReaction;
        if (prev === type) {
            setMyReaction(null);
            type === 'like' ? setLikes((v) => v - 1) : setDislikes((v) => v - 1);
        } else {
            setMyReaction(type);
            if (type === 'like') { setLikes((v) => v + 1); if (prev === 'dislike') setDislikes((v) => v - 1); }
            else { setDislikes((v) => v + 1); if (prev === 'like') setLikes((v) => v - 1); }
        }
        onVote(comment.id, type);
    };

    const toggleReplies = async () => {
        if (repliesOpen) { setRepliesOpen(false); return; }
        setRepliesOpen(true);
        if (replies.length === 0 && onLoadReplies) {
            setLoadingReplies(true);
            try { setReplies(await onLoadReplies(comment.id)); }
            catch { toast.error("Không tải được trả lời"); }
            finally { setLoadingReplies(false); }
        }
    };

    const handleReplyClick = () => {
        if (!session?.user?.name) {
            toast.error("Vui lòng đăng nhập để trả lời");
            onOpenLogin?.();
            return;
        }
        setReplyBoxOpen((v) => !v);
    };

    // khi đang mở sẵn danh sách trả lời, chèn thẳng reply mới vào thay vì im lặng bỏ qua
    const handleReplySubmit = async (content: string, isSpoiler: boolean): Promise<boolean> => {
        if (!onReplySubmit) return false;
        const newReply = await onReplySubmit(comment.id, content, isSpoiler);
        if (!newReply) return false;

        setReplyCount((v) => v + 1);
        setReplyBoxOpen(false);

        if (!repliesOpen) {
            setRepliesOpen(true);
            if (onLoadReplies) {
                setLoadingReplies(true);
                try { setReplies(await onLoadReplies(comment.id)); }
                catch { toast.error("Không tải được trả lời"); }
                finally { setLoadingReplies(false); }
            }
        } else {
            setReplies((prev) => [...prev, newReply]);
        }
        return true;
    };

    const handleReport = async () => {
        if (!session?.user?.name) {
            toast.error("Vui lòng đăng nhập để báo cáo");
            onOpenLogin?.();
            return;
        }
        const ok = await onReport?.(comment.id);
        if (ok) {
            toast.success("Đã gửi báo cáo");
        } else {
            toast.error("Bạn đã báo cáo bình luận này rồi");
        }
    };

    const handleEditSubmit = async (content: string): Promise<boolean> => {
        if (!onEditOwn) return false;
        const ok = await onEditOwn(comment.id, content);
        if (ok) {
            setDisplayContent(content);
            setDisplayEdited(true);
            setEditing(false);
            toast.success("Đã lưu chỉnh sửa");
            return true;
        }
        toast.error("Không thể chỉnh sửa bình luận");
        return false;
    };

    const handlePinSelf = async () => {
        const ok = await onPin?.(comment.id, !isPinned);
        if (ok) setIsPinned((v) => !v);
    };
    const handlePinGlobalSelf = async () => {
        const ok = await onPinGlobal?.(comment.id, !isGlobalPinned);
        if (ok) setIsGlobalPinned((v) => !v);
    };
    const handleLockSelf = async () => {
        const nextLock = !isLocked;
        const ok = await onLock?.(comment.id, nextLock);
        if (ok) { setIsLocked(nextLock); setStatus(nextLock ? 'flagged' : 'active'); }
    };
    const handleAdminDeleteSelf = async () => { await onAdminDelete?.(comment.id); };
    const handleDeleteOwnSelf = async () => { await onDeleteOwn?.(comment.id); };

    const handleChildPin = async (id: string, pin: boolean) => {
        const ok = await onPin?.(id, pin);
        if (ok) setReplies((prev) => prev.map((r) => (r.id === id ? { ...r, isPinned: pin } : r)));
        return !!ok;
    };
    const handleChildPinGlobal = async (id: string, pin: boolean) => {
        const ok = await onPinGlobal?.(id, pin);
        if (ok) setReplies((prev) => prev.map((r) => (r.id === id ? { ...r, isGlobalPinned: pin } : r)));
        return !!ok;
    };
    const handleChildLock = async (id: string, lock: boolean) => {
        const ok = await onLock?.(id, lock);
        if (ok) setReplies((prev) => prev.map((r) => (
            r.id === id ? { ...r, isLocked: lock, status: lock ? 'flagged' : 'active' } : r
        )));
        return !!ok;
    };
    const handleChildAdminDelete = async (id: string) => {
        const ok = await onAdminDelete?.(id);
        if (ok) {
            setReplies((prev) => prev.filter((r) => r.id !== id));
            setReplyCount((v) => Math.max(0, v - 1));
        }
        return !!ok;
    };
    const handleChildDeleteOwn = async (id: string) => {
        const ok = await onDeleteOwn?.(id);
        if (ok) {
            setReplies((prev) => prev.filter((r) => r.id !== id));
            setReplyCount((v) => Math.max(0, v - 1));
        }
        return !!ok;
    };

    const pinType: PinType = isGlobalPinned ? 'global' : isPinned ? 'normal' : null;
    const badge = roleBadge[comment.user.role];
    const FilmBadgeIcon = comment.user.badge ? BADGE_ICON[comment.user.badge] : undefined;
    const avatarSize = isReply ? 30 : 36;

    const isAdmin = session?.user?.role === 'boss' || session?.user?.role === 'moderator';
    const isBoss = session?.user?.role === 'boss';
    const isOwner = !!session?.user?.name && session.user.name === comment.user.name;

    return (
        <li
            id={`comment-${comment.id}`}
            className={`${styles.commentcard} ${pinType ? `${styles.pinnedCard} ${PIN_CARD_CLASS[pinType]}` : ''}`}
        >
            {pinType && (
                <div className={`${styles.globalTag} ${PIN_TEXT_CLASS[pinType]}`}>
                    <AiringFlameIcon className="w-6 h-6" style={{ color: PIN_ICON_COLOR[pinType] }} />
                    {PIN_LABEL[pinType]}
                </div>
            )}
            <div className="flex gap-3">
                <div className={styles.avatarwrap} style={{ width: avatarSize, height: avatarSize }}>
                    {comment.user.avatar ? (
                        <Image src={comment.user.avatar} alt={comment.user.name} width={avatarSize} height={avatarSize} className="object-cover w-full h-full" />
                    ) : comment.user.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className={getUsernameClass(comment.user.role)}>
                            {comment.user.name}
                        </span>
                        {comment.episodeNum > 0 && (
                            <span className={styles.epTag}>Tập {comment.episodeNum.toString().padStart(2, '0')}</span>
                        )}
                        {badge && (
                            <span className={styles.roleBadge} style={{ backgroundColor: badge.color }}>
                                <badge.icon className="w-3 h-3" /> {badge.label}
                            </span>
                        )}
                        {comment.user.badge && FilmBadgeIcon && (
                            <span className={styles.filmBadge} style={{ backgroundColor: comment.user.badgeColor || '#d14836' }}>
                                <FilmBadgeIcon className="w-3 h-3" />
                                {comment.user.badge}
                            </span>
                        )}
                        <span className="text-neutral-500 text-xs">{formatRelativeTime(comment.createdAt)}</span>
                        {isFlagged && (
                            <span className={styles.lockedTag}>
                                <LockIcon className="w-3 h-3" /> Đã khoá
                            </span>
                        )}
                    </div>

                    {editing ? (
                        <div className="mt-2">
                            <CommentInput
                                session={session}
                                initialValue={displayContent}
                                submitLabel="Lưu"
                                autoFocus
                                onCancel={() => setEditing(false)}
                                onSubmit={handleEditSubmit}
                            />
                        </div>
                    ) : (
                        <div className="mt-1 text-[15px] leading-snug text-neutral-100 break-words">
                            {isFlagged ? (
                                <div className={styles.lockedContent}>
                                    <LockIcon className="w-4 h-4" />
                                    Bình luận đã bị khoá do vi phạm quy định cộng đồng.
                                </div>
                            ) : comment.isSpoiler && !revealed ? (
                                <div 
                                    onClick={() => setRevealed(true)}
                                    className="relative flex items-center justify-center w-full min-h-[50px] p-3 rounded-lg border border-red-900/30 bg-gradient-to-r from-red-950/20 via-black/40 to-black/40 cursor-pointer overflow-hidden group transition-all hover:border-red-900/50"
                                >
                                    <div className="absolute inset-0 p-3 blur-sm opacity-30 pointer-events-none select-none text-neutral-500 overflow-hidden">
                                        {stripStickerTokens(displayContent)}
                                    </div>
                                    <div className="relative z-10 bg-[#e53935] text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded shadow-lg transition-transform group-hover:scale-105">
                                        SPOILER — Click để xem
                                    </div>
                                </div>
                            ) : (
                                <CommentRichText content={displayContent} />
                            )}

                            {displayEdited && !isFlagged && <span className="text-xs text-neutral-500 italic ml-1">(đã chỉnh sửa)</span>}
                        </div>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-neutral-400 text-xs">
                        <button
                            disabled={isFlagged}
                            className={`${styles.voteBtn} ${myReaction === 'like' ? styles.voteActiveLike : ''} ${isFlagged ? 'opacity-40 cursor-not-allowed' : ''}`}
                            onClick={() => handleVote('like')}
                        >
                            <LikeIcon className="w-4 h-4" /> {likes}
                        </button>
                        <button
                            disabled={isFlagged}
                            className={`${styles.voteBtn} ${myReaction === 'dislike' ? styles.voteActiveDislike : ''} ${isFlagged ? 'opacity-40 cursor-not-allowed' : ''}`}
                            onClick={() => handleVote('dislike')}
                        >
                            <DislikeIcon className="w-4 h-4" /> {dislikes}
                        </button>
                        {!isReply && !isFlagged && (
                            <button className={`${styles.replyToggle} ${replyBoxOpen ? styles.replyToggleActive : ''}`} onClick={handleReplyClick}>
                                <ReplyIcon className="w-4 h-4" /> Trả lời
                            </button>
                        )}
                        <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                                <button className="hover:text-white ml-auto"><KebabIcon className="w-4 h-4" /></button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Comment actions">
                                <DropdownItem key="views" color="secondary" startContent={<ViewInteractionsIcon className="w-4 h-4" />} onPress={() => setReactorsOpen(true)}>
                                    Xem người tương tác
                                </DropdownItem>

                                {isOwner && !isFlagged ? (
                                    <DropdownItem key="edit" color="primary" startContent={<EditIcon className="w-4 h-4" />} onPress={() => setEditing(true)}>
                                        Sửa bình luận
                                    </DropdownItem>
                                ) : null}

                                {isAdmin ? (
                                    <DropdownItem key="pin" color="success" startContent={<PinIcon className="w-4 h-4" />} onPress={handlePinSelf}>
                                        {isPinned ? 'Bỏ ghim' : 'Ghim bình luận'}
                                    </DropdownItem>
                                ) : null}
                                
                                {isAdmin && isBoss ? (
                                    <DropdownItem key="pinGlobal" color="success" startContent={<GlobeIcon className="w-4 h-4" />} onPress={handlePinGlobalSelf}>
                                        {isGlobalPinned ? 'Bỏ ghim toàn server' : 'Ghim toàn server'}
                                    </DropdownItem>
                                ) : null}
                                
                                {isAdmin ? (
                                    <DropdownItem key="lock" color="warning" startContent={<LockIcon className="w-4 h-4" />} onPress={handleLockSelf}>
                                        {isLocked ? 'Mở khoá bình luận' : 'Khoá bình luận'}
                                    </DropdownItem>
                                ) : null}

                                {(isOwner || isAdmin) ? (
                                    <DropdownItem
                                        key="delete" color="danger"
                                        startContent={<TrashIcon className="w-4 h-4" />}
                                        onPress={() => (isAdmin && !isOwner ? handleAdminDeleteSelf : handleDeleteOwnSelf)()}
                                    >
                                        {isAdmin && !isOwner ? 'Xoá bình luận (Admin)' : 'Xoá bình luận của bạn'}
                                    </DropdownItem>
                                ) : null}

                                <DropdownItem
                                    key="report" color="warning"
                                    startContent={<FlagReportIcon className="w-4 h-4" />}
                                    onPress={handleReport}
                                >
                                    Báo cáo bình luận
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>

                    {replyBoxOpen && (
                        <div className="mt-3">
                            <CommentInput
                                session={session}
                                initialValue={replyMentionPrefill}
                                placeholder={`Trả lời ${comment.user.name}...`}
                                submitLabel="Trả lời"
                                autoFocus
                                onCancel={() => setReplyBoxOpen(false)}
                                onSubmit={handleReplySubmit}
                            />
                        </div>
                    )}
                </div>
            </div>

            {!isReply && replyCount > 0 && (
                <div className="mt-2 ml-[46px]">
                    <button className={styles.viewReplies} onClick={toggleReplies}>
                        <ReplyIcon className="w-4 h-4" /> {repliesOpen ? 'Ẩn trả lời' : `${replyCount} trả lời`}
                    </button>
                    {repliesOpen && (
                        <div className="mt-2 space-y-2">
                            {loadingReplies ? <Spinner size="sm" /> : (
                                <ul className="space-y-2">
                                    {replies.map((r) => (
                                        <CommentItem
                                            key={r.id} comment={r} session={session} isReply
                                            onVote={onVote} onReport={onReport} onOpenLogin={onOpenLogin}
                                            onAdminDelete={handleChildAdminDelete} onDeleteOwn={handleChildDeleteOwn}
                                            onEditOwn={onEditOwn} onLock={handleChildLock}
                                            onPin={handleChildPin} onPinGlobal={handleChildPinGlobal}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            )}

            <ReactorsModal
                isOpen={reactorsOpen}
                onOpenChange={() => setReactorsOpen(false)}
                commentId={comment.id}
                likesCount={likes}
                dislikesCount={dislikes}
            />
        </li>
    );
}

export default React.memo(CommentItem);
