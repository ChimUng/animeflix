// @deprecated — Consumet meta/anilist và Anify (api.anify.tv) không còn hoạt động ổn định.
// Giữ file này lại phòng khi cần bật lại tạm thời, nhưng KHÔNG gọi trong route.tsx nữa.
// Khi chắc chắn không cần nữa, xoá cả file này + fetchConsumet/fetchAnify trong route.tsx.
 
export interface RawEpisode {
  id?: string;
  episodeId?: string;
  number: number;
  title?: string;
  url?: string;
  isFiller?: boolean;
  img?: string;
  image?: string;
  description?: string;
}
 
export interface AnifyEpisode {
  id?: string;
  episodeId?: string;
  number: number;
  title?: string;
  isFiller?: boolean;
  image?: string;
  description?: string;
}
 
export interface AnifyProvider {
  providerId: string;
  episodes: AnifyEpisode[] | { sub?: AnifyEpisode[]; dub?: AnifyEpisode[] };
}