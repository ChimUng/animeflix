// Domain type DUY NHẤT cho Episode/Provider — dùng ở component, store, getData.ts, route.tsx.
// Raw shape của từng provider (animepahe, anineko, animehay...) KHÔNG nằm ở đây,
// chúng nằm trong ./providers/*.raw.ts và chỉ được adapter convert sang Episode ở đây.

import { AnimeItem } from './anime';

export interface Episode {
    id?: string;          // dùng cho provider trả id trực tiếp (animepahe, anineko, animehay ghép id)
    episodeId?: string;    // legacy field một số provider cũ dùng riêng tên này (zoro)
    number: number;
    title?: string;
    description?: string;
    img?: string;
    image?: string;
    isFiller?: boolean;
}

export interface Provider {
    providerId: string;
    id: string;
    consumet?: boolean; // TODO: xoá khi bỏ hẳn nhánh consumet/anify (đang deprecate)
    episodes: Episode[] | { sub?: Episode[]; dub?: Episode[] };
}

// Dữ liệu enrich từ AniZip (ảnh/tiêu đề/mô tả đẹp) — match theo episode.number
export interface EpisodeMeta {
    number?: number;
    episode?: number;
    img?: string;
    image?: string;
    title?: string | { en?: string; ['x-jat']?: string };
    description?: string;
    overview?: string;
    summary?: string;
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

export interface RecentEpisode extends AnimeItem {
    currentEpisode: number;
    airingAt: number;
}

// ─── Video source (giữ nguyên từ EpisodeFunctions.ts, không đổi) ───────────
export interface VideoSource {
    url: string;
    quality?: string;
    isM3U8?: boolean;
    type?: string;
}

export interface VideoTrack {
    url: string;
    lang: string;
    kind: string;
    default?: boolean;
}

export interface VideoTimeRange {
    start: number;
    end: number;
}

export interface VideoData {
    sources: VideoSource[];
    tracks?: VideoTrack[];
    intro?: VideoTimeRange;
    outro?: VideoTimeRange;
    headers?: Record<string, string>;
}