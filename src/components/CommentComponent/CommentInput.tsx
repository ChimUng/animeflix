"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Button, Checkbox } from "@nextui-org/react";
import Image from 'next/image';
import type { Session } from 'next-auth';
import { SmileIcon } from '@/lib/SvgIcons';
import { stickerCategories } from './colorHash';
import { hasSubmittableContent, makeStickerToken, parseCommentContent } from '@/lib/commentContent';
import styles from '../../styles/CommentSection.module.css';

interface Props {
    session: Session | null;
    placeholder?: string;
    submitLabel?: string;
    autoFocus?: boolean;
    onCancel?: () => void;
    onSubmit: (content: string, isSpoiler: boolean) => Promise<boolean> | boolean;
    initialValue?: string;
    initialIsSpoiler?: boolean;
}

const STICKER_PX = 32;

function renderContentIntoEditor(root: HTMLElement, content: string) {
    root.innerHTML = '';
    parseCommentContent(content).forEach((part) => {
        if (part.type === 'text') {
            if (part.value) root.appendChild(document.createTextNode(part.value));
        } else {
            root.appendChild(buildStickerImg(part.url));
        }
    });
}

function buildStickerImg(url: string): HTMLImageElement {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'sticker';
    img.dataset.stickerUrl = url;
    img.draggable = false;
    img.contentEditable = 'false';
    img.style.width = `${STICKER_PX}px`;
    img.style.height = `${STICKER_PX}px`;
    img.className = 'inline-block align-middle mx-0.5 object-contain select-none';
    return img;
}

function serializeEditorContent(root: HTMLElement): string {
    let out = '';
    const walk = (node: ChildNode) => {
        if (node.nodeType === Node.TEXT_NODE) {
            out += (node.textContent || '').replace(/\u200B/g, '');
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.tagName === 'IMG' && el.dataset.stickerUrl) {
                out += makeStickerToken(el.dataset.stickerUrl);
            } else if (el.tagName === 'BR') {
                out += '\n';
            } else {
                if ((el.tagName === 'DIV' || el.tagName === 'P') && out.length > 0 && !out.endsWith('\n')) {
                    out += '\n';
                }
                el.childNodes.forEach(walk);
            }
        }
    };
    root.childNodes.forEach(walk);
    return out;
}

function CommentInput({
    session, placeholder = "Viết bình luận của bạn...", submitLabel = "Bình luận",
    autoFocus, onCancel, onSubmit, initialValue = '', initialIsSpoiler = false,
}: Props) {
    const editorRef = useRef<HTMLDivElement>(null);
    const savedRangeRef = useRef<Range | null>(null);

    const [isEmpty, setIsEmpty] = useState(!hasSubmittableContent(initialValue));
    const [isSpoiler, setIsSpoiler] = useState(initialIsSpoiler);
    const [submitting, setSubmitting] = useState(false);
    const [stickerOpen, setStickerOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState(stickerCategories[0]?.key ?? '');

    useEffect(() => {
        if (editorRef.current) renderContentIntoEditor(editorRef.current, initialValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Autofocus + đặt con trỏ cuối nội dung
    useEffect(() => {
        if (!autoFocus || !editorRef.current) return;
        editorRef.current.focus();
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        savedRangeRef.current = range.cloneRange();
    }, [autoFocus]);

    const avatar = session?.user?.image?.medium || session?.user?.image?.large;

    const syncEmptyState = () => {
        if (editorRef.current) {
            setIsEmpty(!hasSubmittableContent(serializeEditorContent(editorRef.current)));
        }
    };

    // Lưu lại vị trí con trỏ trong lúc editor còn focus, để lát nữa click
    // sang panel sticker (mất focus) vẫn biết chèn ảnh vào đúng chỗ.
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const handleSubmit = async () => {
        if (!editorRef.current || submitting) return;
        const raw = serializeEditorContent(editorRef.current).trim();
        if (!hasSubmittableContent(raw)) return;

        setSubmitting(true);
        try {
            const ok = await onSubmit(raw, isSpoiler);
            if (ok !== false && !initialValue) {
                editorRef.current.innerHTML = '';
                setIsSpoiler(false);
                setIsEmpty(true);
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Chèn sticker vào đúng vị trí con trỏ đã lưu (hoặc cuối nội dung nếu
    // chưa từng focus vào editor), sau đó thêm 1 zero-width space để con trỏ
    // có chỗ đứng ngay sau ảnh, cho phép gõ tiếp / chèn sticker khác liền kề.
    const handlePickSticker = (url: string) => {
        const editor = editorRef.current;
        if (!url || !editor) return;
        editor.focus();

        const sel = window.getSelection();
        let range = savedRangeRef.current;
        if (!range || !editor.contains(range.startContainer)) {
            range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
        }
        sel?.removeAllRanges();
        sel?.addRange(range);

        const img = buildStickerImg(url);
        const spacer = document.createTextNode('\u200B');
        range.deleteContents();
        range.insertNode(spacer);
        range.insertNode(img);

        range.setStartAfter(spacer);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
        savedRangeRef.current = range.cloneRange();

        syncEmptyState();
        setStickerOpen(false);
    };

    const activeItems = stickerCategories.find((c) => c.key === activeCategory)?.items.filter(Boolean) ?? [];

    return (
        <div className={styles.commentinputbox}>
            <div className={styles.inputrow}>
                <div className={styles.inputavatar}>
                    {avatar && <Image src={avatar} alt="avatar" width={36} height={36} className="object-cover w-full h-full" />}
                </div>

                <div className="relative flex-1">
                    {isEmpty && (
                        <span className="pointer-events-none absolute left-4 top-2.5 text-neutral-500 select-none">
                            {placeholder}
                        </span>
                    )}
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        role="textbox"
                        aria-multiline="true"
                        onInput={syncEmptyState}
                        onKeyUp={saveSelection}
                        onMouseUp={saveSelection}
                        className={`${styles.inputTextarea} outline-none break-words`}
                        style={{ whiteSpace: 'pre-wrap', minHeight: autoFocus ? 56 : 40 }}
                    />
                </div>
            </div>

            <div className={styles.inputfooter}>
                <div className="flex items-center gap-3">
                    <Checkbox
                        size="sm"
                        color="danger"
                        isSelected={isSpoiler}
                        onValueChange={setIsSpoiler}
                        classNames={{ label: "text-sm text-neutral-300", wrapper: styles.redCheckbox }}
                    >
                        Tiết lộ nội dung
                    </Checkbox>
                    <button
                        type="button"
                        className={`p-1.5 rounded-md transition-colors hover:text-yellow-400 ${stickerOpen ? 'text-yellow-400' : 'text-neutral-400'}`}
                        title="Thêm Emoji / GIF"
                        onClick={() => setStickerOpen((v) => !v)}
                    >
                        <SmileIcon className="w-[22px] h-[22px]" />
                    </button>
                </div>
                <div className="flex gap-2">
                    {onCancel && (
                        <Button size="lg" variant="light" radius="md" onPress={onCancel}>Huỷ</Button>
                    )}
                    <Button
                        size="lg"
                        radius="md"
                        className={styles.submitBtn}
                        isDisabled={isEmpty}
                        isLoading={submitting}
                        onPress={handleSubmit}
                    >
                        {submitLabel}
                    </Button>
                </div>
            </div>

            {stickerOpen && (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/30">
                    <div className="flex items-center gap-2 p-3 border-b border-white/10 overflow-x-auto">
                        {stickerCategories.map((cat) => (
                            <button
                                key={cat.key}
                                type="button"
                                title={cat.name}
                                onClick={() => setActiveCategory(cat.key)}
                                className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-lg overflow-hidden border-2 bg-white/5 transition-colors ${
                                    activeCategory === cat.key ? 'border-[#d14836]' : 'border-transparent hover:border-white/20'
                                }`}
                            >
                                <Image src={cat.cover} alt={cat.name} width={40} height={40} unoptimized className="object-contain" />
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-[260px] overflow-y-auto p-3">
                        {activeItems.length === 0 ? (
                            <p className="col-span-full text-center text-xs text-neutral-500 py-6">
                                Chưa có sticker nào trong danh mục này. Thêm URL vào gif.ts nhé.
                            </p>
                        ) : (
                            activeItems.map((url, i) => (
                                <button
                                    key={`${activeCategory}-${i}`}
                                    type="button"
                                    onClick={() => handlePickSticker(url)}
                                    className="aspect-square flex items-center justify-center rounded-md overflow-hidden bg-white/5 hover:bg-white/10 transition-colors p-1"
                                >
                                    <Image src={url} alt="" width={44} height={44} unoptimized className="object-contain" />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CommentInput;