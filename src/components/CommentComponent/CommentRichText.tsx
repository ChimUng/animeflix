"use client";
import React from 'react';
import Image from 'next/image';
import { parseCommentContent } from '@/lib/commentContent';

interface Props {
    content: string;
    stickerSize?: number;
    className?: string;
}

function CommentRichText({ content, stickerSize = 40, className }: Props) {
    const parts = parseCommentContent(content);
    return (
        <span className={className}>
            {parts.map((part, i) =>
                part.type === 'text' ? (
                    part.value ? (
                        <span key={i} className="whitespace-pre-wrap">{part.value}</span>
                    ) : null
                ) : (
                    <Image
                        key={i}
                        src={part.url}
                        alt="sticker"
                        width={stickerSize}
                        height={stickerSize}
                        unoptimized
                        className="inline-block align-middle mx-0.5 object-contain"
                    />
                )
            )}
        </span>
    );
}

export default React.memo(CommentRichText);