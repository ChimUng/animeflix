export interface AnimeTitle {
    romaji: string | null;
    english?: string | null;
    native?: string | null;
    vi?: string | null;
    [key: string]: string | null | undefined;
}

export interface CoverImage {
    large: string | null;
    medium?: string | null;
    extraLarge?: string | null;
    color?: string | null;
}

export interface NextAiringEpisode {
    episode: number;
    airingAt?: number;
    timeUntilAiring?: number;
}

export interface GogoEpisode {
    id: string;
    number: number;
}

export interface AnimeItem {
    id: string | number;
    idMal?: number | null;
    title: AnimeTitle;
    status?: 'RELEASING' | 'FINISHED' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS' | null;
    type?: 'ANIME' | 'MANGA' | string | null;
    coverImage?: CoverImage | null;
    bannerImage?: string | null;
    description?: string | null;
    trailer?: any;
    format?: string | null;
    episodes?: number | null;
    totalEpisodes?: number | null;
    currentEpisode?: number | null;
    chapters?: number | null;
    genres?: string[] | null;
    nextAiringEpisode?: NextAiringEpisode | null;
    recommendations?: {
        nodes: { mediaRecommendation: AnimeItem }[] | null; // Sửa từ node thành mediaRecommendation
    };
        relations?: {
        edges: { node: AnimeItem; relationType: string }[] | null;
    } | null;
    episodesData?: {
        data: {
            providerId: string;
            episodes: GogoEpisode[];
        }[];
    } | null;
    mediaRecommendation?: AnimeItem | null;
    node?: AnimeItem | null;
    relationType?: string | null;
    [key: string]: any;
}

export interface EpisodeInfo {
  id?: string;
  episodeId?: string;
  number?: number;
  title?: string;
  description?: string;
  img?: string;
  image?: string;
  isFiller?: boolean;
}

export interface GroupedEpisodes {
  previousep?: EpisodeInfo;
  currentep?: EpisodeInfo;
  nextep?: EpisodeInfo;
}

export interface Episode {
    id?: string;
    episodeId?: string;
    number: number;
    title?: string;
    description?: string;
    img?: string;
    image?: string;
    isFiller?: boolean;
}

export interface Provider {
    providerId: string;
    id: string; // Thêm id vào Provider
    consumet?: boolean;
    episodes: Episode[] | { sub?: Episode[]; dub?: Episode[] };
}

