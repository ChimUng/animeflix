const STICKER_TOKEN_SRC = '\\[sticker:(https?:\\/\\/[^\\]\\s]+)\\]';

export type CommentContentPart =
    | { type: 'text'; value: string }
    | { type: 'sticker'; url: string };

export function makeStickerToken(url: string): string {
    return `[sticker:${url}]`;
}

export function parseCommentContent(content: string): CommentContentPart[] {
    const regex = new RegExp(STICKER_TOKEN_SRC, 'g');
    const parts: CommentContentPart[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'sticker', url: match[1] });
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
        parts.push({ type: 'text', value: content.slice(lastIndex) });
    }
    return parts;
}

// Dùng cho preview mờ (spoiler) — không cần hiện ảnh, chỉ cần chữ để blur
export function stripStickerTokens(content: string): string {
    return content.replace(new RegExp(STICKER_TOKEN_SRC, 'g'), ' [sticker] ');
}

// Hợp lệ để submit khi: có chữ khác khoảng trắng, HOẶC có ít nhất 1 sticker
export function hasSubmittableContent(content: string): boolean {
    const withoutStickers = content.replace(new RegExp(STICKER_TOKEN_SRC, 'g'), '');
    if (withoutStickers.trim().length > 0) return true;
    return new RegExp(STICKER_TOKEN_SRC).test(content);
}