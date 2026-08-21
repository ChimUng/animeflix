"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Modal, ModalContent, ModalBody, useDisclosure, Tooltip } from "@nextui-org/react";
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';
import type { Session } from 'next-auth';
import { CommentData, ReactionType, AnimeTitleSnapshot } from '@/types/comment';
import CommentInput from './CommentInput';
import CommentItem from './CommentItem';
import {
    createCommentAction, getCommentsAction, getRepliesAction, voteCommentAction,
    reportCommentAction, getTotalCommentCountAction, pinCommentAction,
    pinGlobalCommentAction, adminDeleteCommentAction, deleteOwnCommentAction,
    editOwnCommentAction, lockCommentAction, getGlobalPinnedCommentsAction,
    type CommentsCursor, type CommentCreateMeta,
} from '@/lib/CommentFunctions';
import { CommentBubbleIcon, EpRefreshIcon, EpReverseIcon, ChevronDoubleDownIcon } from '@/lib/SvgIcons';
import styles from '../../styles/CommentSection.module.css';

interface Props {
    filmId: string;
    aniId: number;
    episodeNum?: number;
    session: Session | null;
    animeTitle?: AnimeTitleSnapshot | null;
    provider?: string | null;
    epId?: string | null;
    subtype?: string | null;
    // ── dữ liệu fetch sẵn ở server (Server Component) — có thì bỏ qua lần load đầu ──
    initialComments?: CommentData[];
    initialTotal?: number;
    initialHasMore?: boolean;
    initialGlobalPins?: CommentData[];
}

type SortOption = 'newest' | 'top';
const PAGE_SIZE = 20;

function CommentSection({
    filmId, aniId, episodeNum = 0, session,
    animeTitle, provider, epId, subtype,
    initialComments, initialTotal, initialHasMore, initialGlobalPins,
}: Props) {
    const initialMerged = initialComments
        ? [
            ...(initialGlobalPins ?? []),
            ...initialComments.filter((d) => !(initialGlobalPins ?? []).some((g) => g.id === d.id)),
          ]
        : [];

    const [comments, setComments] = useState<CommentData[]>(initialMerged);
    const [totalCount, setTotalCount] = useState(initialTotal ?? 0);
    const [sort, setSort] = useState<SortOption>('newest');
    const [loading, setLoading] = useState(!initialComments);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialHasMore ?? true);

    const { isOpen: openlist, onOpen: Handlelist, onOpenChange: setOpenList } = useDisclosure();

    const meta: CommentCreateMeta = {
        animeTitle: animeTitle ?? undefined,
        provider: provider ?? undefined,
        epId: epId ?? undefined,
        subtype: subtype ?? undefined,
    };

    // đánh dấu đã có dữ liệu SSR cho đúng filmId/episodeNum hiện tại — chỉ bỏ qua
    // lần fetch đầu NẾU dữ liệu đó thực sự khớp với params đang render (tránh trường
    // hợp component re-mount với filmId khác mà vẫn dùng nhầm data cũ)
    const hasSSRData = useRef(!!initialComments);
    const isFirstRun = useRef(true);

    useEffect(() => {
        let cancelled = false;

        // lần chạy đầu tiên + đã có data SSR + đang ở sort mặc định ('newest', khớp
        // với sort mà trang server dùng để fetch) => khỏi gọi lại action, dùng luôn state ban đầu
        if (isFirstRun.current && hasSSRData.current && sort === 'newest') {
            isFirstRun.current = false;
            return;
        }
        isFirstRun.current = false;

        const load = async () => {
            setLoading(true);
            const [data, total, globalPins] = await Promise.all([
                getCommentsAction(filmId, episodeNum, sort, null, PAGE_SIZE),
                getTotalCommentCountAction(filmId, episodeNum),
                getGlobalPinnedCommentsAction(),
            ]);
            if (!cancelled) {
                const merged = [
                    ...globalPins,
                    ...data.filter((d) => !globalPins.some((g) => g.id === d.id)),
                ];
                setComments(merged);
                setTotalCount(total);
                setHasMore(data.length === PAGE_SIZE);
                setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [filmId, episodeNum, sort]);

    useEffect(() => {
        if (loading || typeof window === 'undefined') return;
        const hash = window.location.hash;
        if (!hash.startsWith('#comment-')) return;

        const targetId = hash.replace('#comment-', '');
        const el = document.getElementById(`comment-${targetId}`);
        if (!el) return;

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add(styles.highlightComment);
        const t = setTimeout(() => el.classList.remove(styles.highlightComment), 2500);
        return () => clearTimeout(t);
    }, [loading, comments]);

    const handleNewComment = async (content: string, isSpoiler: boolean): Promise<boolean> => {
        if (!session?.user?.name) {
            toast.error("Vui lòng đăng nhập để bình luận");
            Handlelist();
            return false;
        }
        const res = await createCommentAction(filmId, aniId, episodeNum, content, isSpoiler, undefined, meta);
        if (res.success && res.data) {
            setComments((prev) => [res.data!, ...prev]);
            setTotalCount((prev) => prev + 1);
            toast.success("Đã đăng bình luận");
            return true;
        }
        toast.error("Lỗi: " + res.error);
        return false;
    };

    const handleReplySubmit = useCallback(async (
        parentId: string, content: string, isSpoiler: boolean
    ): Promise<CommentData | false> => {
        if (!session?.user?.name) {
            toast.error("Vui lòng đăng nhập để trả lời");
            Handlelist();
            return false;
        }
        const res = await createCommentAction(filmId, aniId, episodeNum, content, isSpoiler, parentId, meta);
        if (res.success && res.data) {
            toast.success("Đã đăng trả lời");
            setComments((prev) => prev.map((c) => (c.id === parentId ? { ...c, replyCount: c.replyCount + 1 } : c)));
            setTotalCount((prev) => prev + 1); 
            return res.data;
        }
        toast.error("Lỗi: " + res.error);
        return false;
    }, [filmId, aniId, episodeNum, session, Handlelist, animeTitle, provider, epId, subtype]);

    const handleLoadReplies = useCallback((commentId: string) => getRepliesAction(commentId, filmId), [filmId]);

    const handleVote = useCallback(async (commentId: string, type: ReactionType) => {
        await voteCommentAction(commentId, type);
    }, []);

    const handleReport = useCallback(async (commentId: string): Promise<boolean> => {
        const res = await reportCommentAction(commentId);
        return res.success;
    }, []);

    const handlePin = useCallback(async (commentId: string, pin: boolean): Promise<boolean> => {
        const res = await pinCommentAction(commentId, pin);
        if (res.success) {
            setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, isPinned: pin } : c)));
            return true;
        }
        toast.error(res.error || "Không thể ghim bình luận");
        return false;
    }, []);

    const handlePinGlobal = useCallback(async (commentId: string, pin: boolean): Promise<boolean> => {
        const res = await pinGlobalCommentAction(commentId, pin);
        if (res.success) {
            setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, isGlobalPinned: pin } : c)));
            return true;
        }
        toast.error(res.error || "Không thể ghim toàn server");
        return false;
    }, []);

    const handleLock = useCallback(async (commentId: string, lock: boolean): Promise<boolean> => {
        const res = await lockCommentAction(commentId, lock);
        if (res.success) {
            setComments((prev) => prev.map((c) => (
                c.id === commentId
                    ? { ...c, isLocked: lock, status: lock ? 'flagged' : 'active' }
                    : c
            )));
            toast.success(lock ? "Đã khoá bình luận" : "Đã mở khoá bình luận");
            return true;
        }
        toast.error(res.error || "Không thể khoá bình luận");
        return false;
    }, []);

    const handleEditOwn = useCallback(async (commentId: string, content: string): Promise<boolean> => {
        const res = await editOwnCommentAction(commentId, content);
        return res.success;
    }, []);

    const handleAdminDelete = useCallback(async (commentId: string): Promise<boolean> => {
        const res = await adminDeleteCommentAction(commentId);
        if (res.success) {
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            setTotalCount((prev) => Math.max(0, prev - 1 - (res.cascaded ?? 0)));
            toast.success("Đã xoá bình luận");
            return true;
        }
        toast.error(res.error || "Không thể xoá bình luận");
        return false;
    }, []);

    const handleDeleteOwn = useCallback(async (commentId: string): Promise<boolean> => {
        const res = await deleteOwnCommentAction(commentId);
        if (res.success) {
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            setTotalCount((prev) => Math.max(0, prev - 1 - (res.cascaded ?? 0)));
            toast.success("Đã xoá bình luận của bạn");
            return true;
        }
        toast.error(res.error || "Không thể xoá bình luận");
        return false;
    }, []);

    const handleLoadMore = async () => {
        setLoadingMore(true);
        const normalComments = comments.filter((c) => !c.isPinned && !c.isGlobalPinned);
        const last = normalComments[normalComments.length - 1];
        const cursor: CommentsCursor | null = last
            ? { createdAt: last.createdAt, likesCount: last.likesCount }
            : null;

        const data = await getCommentsAction(filmId, episodeNum, sort, cursor, PAGE_SIZE);
        setComments((prev) => [...prev, ...data.filter((d) => !prev.some((p) => p.id === d.id))]);
        setHasMore(data.length === PAGE_SIZE);
        setLoadingMore(false);
    };

    const pinnedComments = comments.filter((c) => c.isPinned || c.isGlobalPinned);
    const normalComments = comments.filter((c) => !c.isPinned && !c.isGlobalPinned);

    const sharedItemProps = {
        session, onVote: handleVote, onLoadReplies: handleLoadReplies, onReplySubmit: handleReplySubmit,
        onReport: handleReport, onOpenLogin: Handlelist, onPin: handlePin, onPinGlobal: handlePinGlobal,
        onLock: handleLock, onAdminDelete: handleAdminDelete, onDeleteOwn: handleDeleteOwn,
        onEditOwn: handleEditOwn,
    };

    return (
        <div className={styles.commentwrap}>
            <div className={styles.cardhead}>
                <CommentBubbleIcon className="w-9 h-9 text-[#d14836]" />
                <h3 className={styles.headtitle}>Bình luận ({totalCount.toLocaleString('vi-VN')})</h3>

                <Tooltip content={sort === 'newest' ? "Bấm để xem Hot nhất" : "Bấm để xem Mới nhất"}>
                    <button className={styles.iconBtn} onClick={() => setSort((s) => (s === 'newest' ? 'top' : 'newest'))}>
                        <EpReverseIcon className="w-[22px] h-[22px]" />
                    </button>
                </Tooltip>
            </div>

            <div className={styles.inputdivider}>
                {session?.user?.name ? (
                    <div className={styles.inputwrap}>
                        <CommentInput session={session} onSubmit={handleNewComment} />
                    </div>
                ) : (
                    <div className={styles.loginprompt}>
                        <span>Vui lòng <button className={styles.loginlink} onClick={Handlelist}>đăng nhập</button> để tham gia bình luận.</span>
                    </div>
                )}
            </div>

            {pinnedComments.length > 0 && (
                <ul className={`space-y-3 ${styles.pinnedZone}`}>
                    {pinnedComments.map((c) => (
                        <CommentItem key={c.id} comment={c} {...sharedItemProps} />
                    ))}
                </ul>
            )}

            {loading ? (
                <div className="flex justify-center py-8">
                    <EpRefreshIcon className="w-6 h-6 animate-spin" />
                </div>
            ) : comments.length === 0 ? (
                <p className="text-center text-sm text-neutral-500 py-8">
                    Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
                </p>
            ) : (
                <>
                    <div className={styles.commentscroll}>
                        <ul className="space-y-3">
                            {normalComments.map((c) => (
                                <CommentItem key={c.id} comment={c} {...sharedItemProps} />
                            ))}
                        </ul>
                    </div>

                    {hasMore && (
                        <button className={styles.loadMoreBar} onClick={handleLoadMore} disabled={loadingMore}>
                            {loadingMore ? (
                                <EpRefreshIcon className="w-4 h-4 animate-spin text-[#d14836]" />
                            ) : (
                                <span className={styles.loadMoreText}>
                                    <ChevronDoubleDownIcon className="w-4 h-4" />
                                    Tải thêm bình luận
                                </span>
                            )}
                        </button>
                    )}
                </>
            )}

            <Modal
                isOpen={openlist}
                onOpenChange={setOpenList}
                size="xs"
                backdrop="opaque"
                hideCloseButton
                placement="center"
                radius="sm"
                classNames={{ body: "py-6 px-3" }}
            >
                <ModalContent>
                    {() => (
                        <ModalBody>
                            <div className="text-center flex flex-col justify-center items-center">
                                <p className="text-lg mb-3">Đăng nhập để bình luận.</p>
                                <button
                                    className="font-semibold outline-none border-none py-2 px-4 bg-[#4d148c] text-white rounded-md flex items-center"
                                    onClick={() => signIn('AniListProvider')}
                                >
                                    <Image alt="anilist-icon" loading="lazy" width="25" height="25" src="/anilist.svg" className='mr-2' />
                                    Đăng nhập Anilist
                                </button>
                            </div>
                        </ModalBody>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}

export default CommentSection;
