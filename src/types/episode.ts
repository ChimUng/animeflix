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
    rating?: string;       // lấy từ AniZip (CombineEpisodeMeta), provider gốc không có field này
    // Badge gốc từ provider (vd anineko: ["SUB","DUB","HSUB"]) — dùng để tính suboptions
    // cho provider dạng mảng phẳng (xem computeFlatArrayOptions trong EpisodeFunctions.ts).
    // Hiện chỉ anineko trả field này; các provider khác để undefined.
    badges?: string[];
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
    // Giới hạn CHỈ 2 ngôn ngữ en/ja (đã lọc sẵn ở fetchAniZipEpisodeMeta, lib/anizip.ts) —
    // AniZip trả về ~13 ngôn ngữ (de/fr/it/es/ru/ko/ar/th/zh-Hans/x-jat...) nhưng app chỉ
    // cần 2 cái này để hiển thị/fallback, không cần giữ nguyên object nặng nề.
    title?: string | { en?: string; ja?: string };
    description?: string;
    overview?: string;
    summary?: string;
    rating?: string;
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
    rating?: string;
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
    isEmbed?: boolean;  
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
    // ✅ MỚI — server key mà backend đã TỰ CHỌN khi client không truyền serverRaw
    // (vd lần load đầu tiên của 1 tập). Cần field này để PlayerComponent có thể chạy
    // getServers() và getSources() SONG SONG (không phải chờ getServers xong mới biết
    // default server rồi mới resolve) mà vẫn highlight đúng nút trong ServerSelector.
    // Format trùng với ServerOption.key (vd "sub:hd-1", "dub:StreamHG"...).
    resolvedServerKey?: string;
}