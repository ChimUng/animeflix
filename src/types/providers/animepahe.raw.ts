export interface AnimePaheSearchResult {
  id: number;
  title: string;
  url: string;
  year: number;
  poster: string;
  type: string; // "TV" | "Movie" | ...
  session: string; // uuid dùng cho bước 2
}
 
// Bước 2: /episodes?session={uuid}
export interface AnimePaheEpisodeRaw {
  id: number;
  number: number;
  title: string;
  snapshot: string;
  session: string; // episode session hash, ghép với anime session để tạo Episode.id
}
 
// Bước 3: /sources?anime_session=...&episode_session=...
export interface AnimePaheSourceRaw {
  url: string;
  quality: string;
  fansub: string;
  audio: string;
}