// Lưu ý: field "score" ở search result là điểm user rate phim, KHÔNG phải điểm matching.

export interface AnimeHaySearchResult {
  title: string;
  animeSlug: string;
  animeId: string;
  detailUrl: string;
  poster: string | null;
  type: string | null; // "TV" | "Movie"
  epBadge: string | null; // "1169/??" | "8/8"
  score: number | null; // 0-10, rating của user trên animehay — chỉ dùng làm tie-breaker nhỏ khi match
}
 
export interface AnimeHayEpisodeItem {
  number: number | null;
  title: string;
  episodeId: string; // dùng gọi /servers
  url: string;
  isNew: boolean;
}
 
export interface AnimeHayServerItem {
  serverKey: string;
  serverName: string;
  badge: string;
  iframeUrl: string;
  domain: string;
  supported: boolean; // hiện đang fix cứng false ở proxy, KHÔNG dùng field này để lọc render
}