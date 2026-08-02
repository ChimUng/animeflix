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
    const fanartFallback = data?.images?.find((img) => img.coverType === 'Fanart')?.url;

    return episodes.map((ep) => ({
      number:
        ep.absoluteEpisodeNumber ??
        ep.episodeNumber ??
        (ep.episode ? Number(ep.episode) : undefined),
      img: ep.image || fanartFallback,   // fallback khi tập không có ảnh riêng
      title: ep.title ? { en: ep.title.en, ja: ep.title.ja } : undefined,
      description: ep.overview ?? ep.summary,
      rating: ep.rating,
    }));
  } catch (error) {
    console.error(`[AniZip] Error fetching episode meta for Anilist ID ${anilistId}:`, error instanceof Error ? error.message : error);
    return [];
  }
}