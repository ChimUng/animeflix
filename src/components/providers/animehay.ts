import axios from 'axios';
import { Episode, Provider } from '@/types/episode';
import { AnimeHaySearchResult, AnimeHayEpisodeItem } from '@/types/providers/animehay.raw';
import { calculateSimilarity } from '@/lib/matching';

const ANIMEHAY_API_URL = process.env.ANIMEHAY_API_URL || '';

function anilistFormatToAnimeHayType(format?: string): string {
  if (!format) return 'TV';
  if (format.toUpperCase() === 'MOVIE') return 'Movie';
  return 'TV';
}

function scoreAnimeHayResult(result: AnimeHaySearchResult, targetTitle: string, targetType: string): number {
  let score = calculateSimilarity(result.title, targetTitle) * 0.75;
  if (result.type && result.type.toLowerCase() === targetType.toLowerCase()) score += 0.2;
  // score ở đây là rating của user trên animehay (0-10), chỉ dùng làm tie-breaker nhỏ,
  // KHÔNG phải điểm matching
  if (result.score !== null && result.score > 0) score += (result.score / 10) * 0.05;
  return score;
}

export async function fetchAnimeHayEpisodes(
  anilistId: string,
  title: string,
  format?: string,
  titleRomaji?: string
): Promise<Provider[]> {
  try {
    if (!ANIMEHAY_API_URL) {
      console.warn('⚠️ [AnimeHay] ANIMEHAY_API_URL env not set — skipping');
      return [];
    }

    const targetType = anilistFormatToAnimeHayType(format);
    const titlesToTry: string[] = [];
    if (title?.trim()) titlesToTry.push(title.trim());
    if (titleRomaji?.trim() && titleRomaji !== title) titlesToTry.push(titleRomaji.trim());

    if (titlesToTry.length === 0) {
      console.warn(`⚠️ [AnimeHay] No valid title for anilist ID ${anilistId}`);
      return [];
    }

    let bestMatch: AnimeHaySearchResult | null = null;
    let bestScore = 0;

    for (const tryTitle of titlesToTry) {
      let results: AnimeHaySearchResult[] = [];
      try {
        const { data } = await axios.get<{ results: AnimeHaySearchResult[] }>(
          `${ANIMEHAY_API_URL}/search`,
          { params: { q: tryTitle }, timeout: 10000 }
        );
        results = data?.results || [];
      } catch (err) {
        console.warn(`⚠️ [AnimeHay] Search failed for "${tryTitle}":`, (err as Error).message);
        continue;
      }
      if (results.length === 0) continue;

      const scored = results
        .map((r) => ({ result: r, score: scoreAnimeHayResult(r, tryTitle, targetType) }))
        .sort((a, b) => b.score - a.score);

      if (scored[0].score > bestScore) {
        bestScore = scored[0].score;
        bestMatch = scored[0].result;
      }
      if (bestScore >= 0.85) break; // đủ tự tin, không cần thử title tiếp
    }

    const MATCH_THRESHOLD = 0.65; // cao hơn anineko vì thiếu metadata cross-verify
    if (!bestMatch || bestScore < MATCH_THRESHOLD) {
      console.warn(`⚠️ [AnimeHay] No confident match for anilist ID ${anilistId} (best: ${(bestScore * 100).toFixed(1)}%)`);
      return [];
    }

    let episodesData: AnimeHayEpisodeItem[] = [];
    try {
      const { data } = await axios.get<AnimeHayEpisodeItem[]>(
        `${ANIMEHAY_API_URL}/episodes`,
        { params: { anime_slug: bestMatch.animeSlug, anime_id: bestMatch.animeId }, timeout: 15000 }
      );
      episodesData = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(`❌ [AnimeHay] Failed to fetch episodes for "${bestMatch.title}":`, (err as Error).message);
      return [];
    }

    if (episodesData.length === 0) {
      console.warn(`⚠️ [AnimeHay] No episodes for "${bestMatch.title}"`);
      return [];
    }

    // id gộp animeSlug::animeId::episodeId::number, tách ra ở bước lấy source sau này
    const episodes: Episode[] = episodesData
      .filter((ep) => ep.episodeId && ep.number !== null)
      .map((ep) => ({
        id: `${bestMatch!.animeSlug}::${bestMatch!.animeId}::${ep.episodeId}::${ep.number}`,
        number: ep.number ?? 0,
        title: ep.title || `Tập ${ep.number}`,
      }));

    console.log(`✅ [AnimeHay] ${episodes.length} episodes for "${bestMatch.title}"`);

    return [{ providerId: 'vietsub', id: 'vietsub', episodes }];
  } catch (error) {
    console.error(`❌ [AnimeHay] fetchAnimeHayEpisodes error:`, error instanceof Error ? error.message : error);
    return [];
  }
}