import axios from 'axios';
import { Episode, Provider } from '@/types/episode';
import { AnimePaheSearchResult, AnimePaheEpisodeRaw } from '@/types/providers/animepahe.raw';
import { calculateSimilarity, findBestMatch } from '@/lib/matching';

const ANIMEPAHE_API_URL = process.env.ANIMEPAHE_API_URL || '';

async function searchAnimePahe(title: string, year?: number, type?: string): Promise<string | null> {
  try {
    if (!ANIMEPAHE_API_URL) return null;
    // Response là mảng thô, KHÔNG wrap trong { results: [...] } (khác anineko/animehay)
    const { data } = await axios.get<AnimePaheSearchResult[]>(
      `${ANIMEPAHE_API_URL}/search`,
      { params: { q: title }, timeout: 10000 }
    );

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`⚠️ [AnimePahe] No results for "${title}"`);
      return null;
    }

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

    return best?.session || null;
  } catch (error) {
    console.error(`Error searching AnimePahe for "${title}":`, error instanceof Error ? error.message : error);
    return null;
  }
}

export async function fetchAnimePaheEpisodes(
  anilistId: string,
  title: string,
  year?: number,
  type?: string
): Promise<Provider[]> {
  try {
    if (!ANIMEPAHE_API_URL) {
      console.warn('⚠️ [AnimePahe] ANIMEPAHE_API_URL env not set — skipping');
      return [];
    }
    console.log(`🔍 [AnimePahe] Searching for anilist ID ${anilistId}: "${title}"`);

    const session = await searchAnimePahe(title, year, type);
    if (!session) return [];

    const { data } = await axios.get<AnimePaheEpisodeRaw[]>(
      `${ANIMEPAHE_API_URL}/episodes`,
      { params: { session }, timeout: 15000 }
    );

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`⚠️ [AnimePahe] No episodes for session ${session}`);
      return [];
    }

    const episodes: Episode[] = data.map((ep) => ({
      id: ep.session,
      number: ep.number,
      title: ep.title || `Episode ${ep.number}`,
    }));

    return [{ providerId: 'animepahe', id: 'animepahe', episodes }];
  } catch (error) {
    console.error(`Error fetching AnimePahe episodes:`, error instanceof Error ? error.message : error);
    return [];
  }
}