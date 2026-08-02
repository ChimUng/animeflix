export interface AniZipEpisodeTitle {
  ja?: string;
  en?: string;
  [lang: string]: string | undefined;
}

export interface AniZipEpisodeRaw {
  tvdbShowId?: number;
  tvdbId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  absoluteEpisodeNumber?: number;
  title?: AniZipEpisodeTitle;
  airDate?: string;
  airDateUtc?: string;
  runtime?: number;
  overview?: string;
  image?: string;
  episode?: string; // string number, cần Number() khi map
  anidbEid?: number;
  length?: number;
  airdate?: string;
  rating?: string;
  summary?: string;
}

export interface AniZipMappings {
  animeplanet_id?: string;
  kitsu_id?: number;
  mal_id?: number;
  type?: string;
  anilist_id?: number;
  anisearch_id?: number;
  anidb_id?: number;
  notifymoe_id?: number | null;
  livechart_id?: number;
  thetvdb_id?: number;
  imdb_id?: string;
  themoviedb_id?: string;
}

export interface AniZipImage {
  coverType: string;
  url: string;
}

export interface AniZipResponse {
  titles?: Record<string, string>;
  episodes?: Record<string, AniZipEpisodeRaw>;
  episodeCount?: number;
  specialCount?: number;
  images?: AniZipImage[];
  mappings?: AniZipMappings;
}