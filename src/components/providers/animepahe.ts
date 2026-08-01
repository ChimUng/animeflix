import axios from 'axios';
import { Episode, Provider } from '@/types/episode';
import { AnimePaheSearchResult, AnimePaheEpisodeRaw } from '@/types/providers/animepahe.raw';
import { calculateSimilarity, findBestMatch, buildTitleCandidates } from '@/lib/matching';

const ANIMEPAHE_API_URL = process.env.ANIMEPAHE_API_URL || '';

async function searchAnimePaheOnce(title: string, year?: number, type?: string): Promise<{ session: string; usedTitle: string } | null> {
  try {
    const { data } = await axios.get<AnimePaheSearchResult[]>(
      `${ANIMEPAHE_API_URL}/search`,
      { params: { q: title }, timeout: 10000 }
    );

    if (!Array.isArray(data) || data.length === 0) return null;

    const best = findBestMatch(
      data,
      (r) => {
        let score = calculateSimilarity(r.title, title) * 0.7;
        if (type && r.type?.toLowerCase() === type.toLowerCase()) score += 0.15;
        if (year && r.year) score += Math.max(0, 1 - Math.abs(r.year - year) / 10) * 0.1;
        if (r.type?.toLowerCase() === 'tv') score += 0.05;
        return score;
      },
      0.6,
      'AnimePahe'
    );

    return best ? { session: best.session, usedTitle: title } : null;
  } catch (error) {
    console.error(`Error searching AnimePahe for "${title}":`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function searchAnimePahe(title: string, titleRomaji?: string, year?: number, type?: string): Promise<string | null> {
  if (!ANIMEPAHE_API_URL) return null;

  for (const t of buildTitleCandidates(title, titleRomaji)) {
    console.log(`🔍 [AnimePahe] Searching for: "${t}"`);
    const result = await searchAnimePaheOnce(t, year, type);
    if (result) return result.session;
  }

  console.warn(`⚠️ [AnimePahe] No results for any title variant of "${title}"`);
  return null;
}

export async function fetchAnimePaheEpisodes(
  anilistId: string,
  title: string,
  year?: number,
  type?: string,
  titleRomaji?: string
): Promise<Provider[]> {
  try {
    if (!ANIMEPAHE_API_URL) {
      console.warn('⚠️ [AnimePahe] ANIMEPAHE_API_URL env not set — skipping');
      return [];
    }
    console.log(`🔍 [AnimePahe] Searching for anilist ID ${anilistId}: "${title}"`);

    const session = await searchAnimePahe(title, titleRomaji, year, type);
    if (!session) return [];

    const { data } = await axios.get<AnimePaheEpisodeRaw[]>(
      `${ANIMEPAHE_API_URL}/episodes`,
      { params: { session }, timeout: 15000 }
    );

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`⚠️ [AnimePahe] No episodes for session ${session}`);
      return [];
    }

    // snapshot = ảnh thumbnail thật của từng tập do pahe cung cấp -> map vào img,
    // để CombineEpisodeMeta ưu tiên đúng chỗ (xem giải thích phần merge anizip).
    const episodes: Episode[] = data.map((ep) => ({
      id: ep.session,
      number: ep.number,
      title: ep.title || `Episode ${ep.number}`,
      img: ep.snapshot || undefined,
    }));

    return [{ providerId: 'animepahe', id: 'animepahe', episodes }];
  } catch (error) {
    console.error(`Error fetching AnimePahe episodes:`, error instanceof Error ? error.message : error);
    return [];
  }
}