"use client";
import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from "@nextui-org/react";
import { getCommentReactorsAction } from '@/lib/CommentFunctions';
import { LikeIcon, DislikeIcon } from '@/lib/SvgIcons';

interface Reactor {
    id: string;
    name: string;
    avatar: string;
}

interface Props {
    isOpen: boolean;
    onOpenChange: () => void;
    commentId: string | null;
    likesCount: number;
    dislikesCount: number;
}

type Tab = 'like' | 'dislike';
const PAGE_SIZE = 20;

function ReactorsModal({ isOpen, onOpenChange, commentId, likesCount, dislikesCount }: Props) {
    const [tab, setTab] = useState<Tab>('like');
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<Reactor[]>([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchPage = useCallback(async (t: Tab, p: number) => {
        if (!commentId) return;
        setLoading(true);
        const res = await getCommentReactorsAction(commentId, t, p, PAGE_SIZE);
        setItems(res.items);
        setTotal(res.total);
        setHasMore(res.hasMore);
        setLoading(false);
    }, [commentId]);

    useEffect(() => {
        if (isOpen && commentId) {
            setTab('like');
            setPage(1);
            fetchPage('like', 1);
        }
        // reset khi đóng modal để lần mở sau không hiện data cũ trong khoảnh khắc load
        if (!isOpen) {
            setItems([]);
            setTotal(0);
        }
    }, [isOpen, commentId, fetchPage]);

    const switchTab = (t: Tab) => {
        if (t === tab) return;
        setTab(t);
        setPage(1);
        fetchPage(t, 1);
    };

    const goPage = (p: number) => {
        setPage(p);
        fetchPage(tab, p);
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="sm" backdrop="opaque" placement="center" radius="sm">
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader>Người tương tác</ModalHeader>
                        <ModalBody className="pb-6">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => switchTab('like')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                                        tab === 'like'
                                            ? 'bg-[#22c55e26] text-[#22c55e] border border-[#22c55e]'
                                            : 'bg-[#1e1e24] text-neutral-300 border border-transparent'
                                    }`}
                                >
                                    <LikeIcon className="w-4 h-4" /> Like
                                    <span className="px-2 py-0.5 rounded-full bg-black/30 text-xs">{likesCount}</span>
                                </button>
                                <button
                                    onClick={() => switchTab('dislike')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                                        tab === 'dislike'
                                            ? 'bg-[#f8717126] text-[#f87171] border border-[#f87171]'
                                            : 'bg-[#1e1e24] text-neutral-300 border border-transparent'
                                    }`}
                                >
                                    <DislikeIcon className="w-4 h-4" /> Dislike
                                    <span className="px-2 py-0.5 rounded-full bg-black/30 text-xs">{dislikesCount}</span>
                                </button>
                            </div>

                            <div className="mt-3 max-h-[360px] overflow-y-auto pr-1 space-y-1">
                                {loading ? (
                                    <p className="text-center text-sm text-neutral-500 py-6">Đang tải...</p>
                                ) : items.length === 0 ? (
                                    <p className="text-center text-sm text-neutral-500 py-6">
                                        Chưa có ai {tab === 'like' ? 'thích' : 'không thích'} bình luận này.
                                    </p>
                                ) : (
                                    items.map((u) => (
                                        <div key={u.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                                            <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-700 flex items-center justify-center font-semibold flex-shrink-0">
                                                {u.avatar ? (
                                                    <Image src={u.avatar} alt={u.name} width={36} height={36} className="object-cover w-full h-full" />
                                                ) : (
                                                    u.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <span className="text-sm text-neutral-100">{u.name}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-3 text-sm text-neutral-400">
                                    <Button size="sm" variant="flat" isDisabled={page <= 1 || loading} onPress={() => goPage(page - 1)}>
                                        Trước
                                    </Button>
                                    <span>Trang {page}/{totalPages}</span>
                                    <Button size="sm" variant="flat" isDisabled={!hasMore || loading} onPress={() => goPage(page + 1)}>
                                        Sau
                                    </Button>
                                </div>
                            )}
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}

export default ReactorsModal;