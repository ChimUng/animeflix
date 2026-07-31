import axios from 'axios';
import { Episode, Provider } from '@/types/episode';
import { AninekoSearchResult, AninekoEpisodeItem } from '@/types/providers/anineko.raw';
import { calculateSimilarity, findBestMatch } from '@/lib/matching';

const ANINEKO_API_URL = process.env.ANINEKO_API_URL || '';

async function searchAnineko(title: string): Promise<AninekoSearchResult[]> {
  try {
    if (!ANINEKO_API_URL) return [];
    const { data } = await axios.get<{ results: AninekoSearchResult[] }>(
      `${ANINEKO_API_URL}/search`,
      { params: { q: title }, timeout: 10000 }
    );
    return data?.results || [];
  } catch (error) {
    console.error(`Error searching Anineko for "${title}":`, error instanceof Error ? error.message : error);
    return [];
  }
}

export async function fetchAninekoEpisodes(title: string, type?: string): Promise<Provider[]> {
  try {
    if (!ANINEKO_API_URL) return [];
    console.log(`🔍 [Anineko] Searching for: "${title}"`);

    const results = await searchAnineko(title);
    if (results.length === 0) {
      console.warn(`❌ [Anineko] No search results for "${title}"`);
      return [];
    }

    const bestMatch = findBestMatch(
      results,
      (r) => {
        let score = calculateSimilarity(r.title, title) * 0.85;
        if (type && r.type?.toLowerCase() === type.toLowerCase()) score += 0.15;
        return score;
      },
      0.6,
      'Anineko'
    );
    if (!bestMatch) return [];

    const { data: episodesData } = await axios.get<AninekoEpisodeItem[]>(
      `${ANINEKO_API_URL}/episodes`,
      { params: { slug: bestMatch.slug }, timeout: 15000 }
    );

    if (!Array.isArray(episodesData) || episodesData.length === 0) {
      console.warn(`⚠️ [Anineko] No episodes for slug "${bestMatch.slug}"`);
      return [];
    }

    // id gộp animeSlug + episodeSlug, tách ra ở lib/episode-providers/anineko-source.ts (bước lấy source)
    const episodes: Episode[] = episodesData
      .filter((ep) => ep.slug && ep.number != null)
      .map((ep) => ({
        id: `${bestMatch.slug}::${ep.slug}`,
        number: ep.number ?? 0,
        title: ep.title,
      }));

    console.log(`✅ [Anineko] Found ${episodes.length} episodes for "${bestMatch.title}"`);

    return [{ providerId: 'anineko', id: 'anineko', episodes }];
  } catch (error) {
    console.error(`Error fetching Anineko:`, error instanceof Error ? error.message : error);
    return [];
  }
}