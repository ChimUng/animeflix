"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Textarea, Button, Checkbox } from "@nextui-org/react";
import Image from 'next/image';
import type { Session } from 'next-auth';
import { SmileIcon } from '@/lib/SvgIcons';
import styles from '../../styles/CommentSection.module.css';

interface Props {
    session: Session | null;
    placeholder?: string;
    submitLabel?: string;
    autoFocus?: boolean;
    onCancel?: () => void;
    onSubmit: (content: string, isSpoiler: boolean) => Promise<boolean> | boolean;
    // ✅ dùng cho chế độ SỬA bình luận — nạp sẵn nội dung cũ vào ô nhập
    initialValue?: string;
    initialIsSpoiler?: boolean;
}

function CommentInput({
    session, placeholder = "Viết bình luận của bạn...", submitLabel = "Bình luận",
    autoFocus, onCancel, onSubmit, initialValue = '', initialIsSpoiler = false,
}: Props) {
    const [content, setContent] = useState(initialValue);
    const [isSpoiler, setIsSpoiler] = useState(initialIsSpoiler);
    const [submitting, setSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (autoFocus && initialValue && textareaRef.current) {
            const len = initialValue.length;
            textareaRef.current.setSelectionRange(len, len);
        }
    }, [autoFocus, initialValue]);

    const avatar = session?.user?.image?.medium || session?.user?.image?.large;

    const handleSubmit = async () => {
        const trimmed = content.trim();
        if (!trimmed || submitting) return;
        setSubmitting(true);
        try {
            const ok = await onSubmit(trimmed, isSpoiler);
            // ✅ chỉ reset về rỗng khi KHÔNG phải chế độ sửa (chế độ sửa cha sẽ tự đóng form)
            if (ok !== false && !initialValue) { setContent(''); setIsSpoiler(false); }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.commentinputbox}>
            <div className={styles.inputrow}>
                <div className={styles.inputavatar}>
                    {avatar && <Image src={avatar} alt="avatar" width={36} height={36} className="object-cover w-full h-full" />}
                </div>
                <Textarea
                    ref={textareaRef}
                    variant="flat"
                    placeholder={placeholder}
                    minRows={autoFocus ? 2 : 1}
                    autoFocus={autoFocus}
                    disableAnimation
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    classNames={{ inputWrapper: styles.inputTextarea }}
                />
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
                        className="p-1.5 text-neutral-400 transition-colors hover:text-yellow-400 rounded-md"
                        title="Thêm Emoji / GIF"
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
                        isDisabled={!content.trim()}
                        isLoading={submitting}
                        onPress={handleSubmit}
                    >
                        {submitLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default CommentInput;