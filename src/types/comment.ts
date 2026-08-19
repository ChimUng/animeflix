export type UserRole = 'user' | 'moderator' | 'boss';
export type ReactionType = 'like' | 'dislike';
export type CommentStatus = 'active' | 'hidden' | 'flagged';

export interface CommentMedia {
    type: 'gif' | 'sticker';
    url: string;
}

export interface AnimeTitleSnapshot {
    romaji?: string | null;
    english?: string | null;
}

export interface UserImage {
    large?: string | null;
    medium?: string | null;
}

export interface BaseUser {
    name: string;
    email: string;
    image: UserImage;
    role: UserRole;
    badge: string;
    isBanned: boolean;
}

export interface BaseFanStats {
    filmId: string;
    commentCount: number;
    isInAniListList: boolean;
    listCheckedAt: Date | null;
}

export interface BaseReaction {
    type: ReactionType;
}

export interface BaseComment {
    filmId: string;
    episodeNum: number;
    content: string;
    media: CommentMedia | null;
    replyCount: number;
    likesCount: number;
    dislikesCount: number;
    reportsCount: number;
    status: CommentStatus;
    isPinned: boolean;
    isGlobalPinned: boolean;
    isSpoiler: boolean;
    isEdited: boolean;
    isDeleted: boolean;
    isLocked: boolean;

    aniId?: number | null;
    animeTitle?: AnimeTitleSnapshot | null;
    provider?: string | null;
    epId?: string | null;
    subtype?: string | null;
}

export interface CommentUser {
    id: string;
    name: string;
    avatar: string;
    role: UserRole;
    badge?: string;
    badgeColor?: string;
}

export interface CommentData {
    id: string;
    filmId: string;
    episodeNum: number;

    user: CommentUser;
    content: string;
    media?: CommentMedia | null;

    parentId?: string | null;
    replyCount: number;
    likesCount: number;
    dislikesCount: number;
    myReaction?: ReactionType | null;

    status: CommentStatus;
    isPinned: boolean;
    isGlobalPinned: boolean;
    reportsCount?: number;

    isSpoiler: boolean;
    isEdited: boolean;
    isDeleted: boolean;
    isLocked: boolean;

    aniId?: number | null;
    animeTitle?: AnimeTitleSnapshot | null;
    provider?: string | null;
    epId?: string | null;
    subtype?: string | null;

    createdAt: string;
    updatedAt?: string;
}

export interface CommentPage {
    items: CommentData[];
    total: number;
    hasMore: boolean;
}
