import axios from 'axios';
import { AniZipResponse } from '@/types/providers/anizip.raw';
import { EpisodeMeta } from '@/types/episode';
 
/**
 * Lấy MAL id từ Anilist id qua AniZip mappings.
 * Dùng làm fallback khi MalSync không nhận id trực tiếp (MalSync cần MAL id, không phải Anilist id).
 */
export async function fetchAniZipMalId(anilistId: number | string): Promise<string | null> {
  try {
    const { data } = await axios.get<AniZipResponse>(
      `https://api.ani.zip/mappings?anilist_id=${anilistId}`
    );
    return data?.mappings?.mal_id?.toString() || null;
  } catch (error) {
    console.error(`[AniZip] Error fetching mappings for Anilist ID ${anilistId}:`, error instanceof Error ? error.message : error);
    return null;
  }
}
 
/**
 * Lấy metadata (ảnh/tiêu đề/mô tả) từng tập để enrich vào Episode.
 * Match theo episode.number ở CombineEpisodeMeta (EpisodeFunctions.ts) — áp dụng cho MỌI provider,
 * không chỉ provider có mapper sẵn trong MalSync.
 */
export async function fetchAniZipEpisodeMeta(anilistId: number | string): Promise<EpisodeMeta[]> {
  try {
    const { data } = await axios.get<AniZipResponse>(
      `https://api.ani.zip/mappings?anilist_id=${anilistId}`
    );
    const episodes = Object.values(data?.episodes || {});
    return episodes.map((ep) => ({
      // Ưu tiên absoluteEpisodeNumber (số tập tuyệt đối, khớp với cách provider đánh số).
      // episodeNumber chỉ đúng cho season 1 hoặc phim 1 season -> dùng làm fallback.
      // ep.episode (string) là phương án cuối nếu 2 field trên đều thiếu.
      number:
        ep.absoluteEpisodeNumber ??
        ep.episodeNumber ??
        (ep.episode ? Number(ep.episode) : undefined),
      img: ep.image,
      title: ep.title,
      description: ep.overview ?? ep.summary,
    }));
  } catch (error) {
    console.error(`[AniZip] Error fetching episode meta for Anilist ID ${anilistId}:`, error instanceof Error ? error.message : error);
    return [];
  }
}