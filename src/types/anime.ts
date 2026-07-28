export interface AnimeTitle {
    romaji: string | null;
    english?: string | null;
    userPreferred?: string | null;
    [key: string]: string | null | undefined;
}

export interface CoverImage {
    large: string | null;
    extraLarge?: string | null;
    color?: string | null;
}

export interface FuzzyDate {
    year?: number | null;
    month?: number | null;
    day?: number | null;
}

export interface NextAiringEpisode {
    episode: number;
    airingAt?: number;
}

export interface Trailer {
    id: string;
    site?: string;
    thumbnail?: string;
}

export interface AnimeItem {
    id: number;
    idMal?: number | null;
    title: AnimeTitle;
    coverImage?: CoverImage | null;
    bannerImage?: string | null;
    description?: string | null;
    episodes?: number | null;
    status?: 'RELEASING' | 'FINISHED' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS' | null;
    duration?: number | null;
    genres?: string[] | null;
    season?: string | null;
    format?: string | null;
    averageScore?: number | null;
    popularity?: number | null;
    seasonYear?: number | null;
    startDate?: FuzzyDate | null;
    endDate?: FuzzyDate | null;
    nextAiringEpisode?: NextAiringEpisode | null;
    trailer?: Trailer | null;
    totalEpisodes?: number | null;
    currentEpisode?: number | null;
    recommendations?: { nodes: { mediaRecommendation: AnimeItem }[] | null } | null;
    relations?: { edges: { node: AnimeItem; relationType: string }[] | null } | null;
    episodesData?: { data: { providerId: string; episodes: { id: string; number: number }[] }[] } | null;
    mediaRecommendation?: AnimeItem | null;
    node?: AnimeItem | null;
    relationType?: string | null;
}