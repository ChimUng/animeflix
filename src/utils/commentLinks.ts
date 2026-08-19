export interface CommentLinkFields {
    filmId: string;
    episodeNum: number;
    provider?: string | null;
    epId?: string | null;
    subtype?: string | null;
}

export function buildCommentHref(c: CommentLinkFields, commentId: string): string {
    if (c.filmId === 'homepage') return `/#comment-${commentId}`;

    const match = c.filmId.match(/^anime-info-(.+)$/);
    if (!match) return '#';
    const aniId = match[1];

    if (c.episodeNum > 0 && c.provider && c.epId) {
        return `/anime/watch/${aniId}/${c.provider}/${encodeURIComponent(c.epId)}/${c.episodeNum}/${c.subtype || 'sub'}#comment-${commentId}`;
    }
    return `/anime/info/${aniId}#comment-${commentId}`;
}
