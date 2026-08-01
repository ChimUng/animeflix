import axios from 'axios';
import { Episode, Provider } from '@/types/episode';
import { AninekoSearchResult, AninekoEpisodeItem } from '@/types/providers/anineko.raw';
import { calculateSimilarity, findBestMatch, buildTitleCandidates } from '@/lib/matching';
const ANINEKO_API_URL = process.env.ANINEKO_API_URL || '';

async function searchAninekoOnce(title: string): Promise<AninekoSearchResult[]> {
  try {
    if (!ANINEKO_API_URL) return [];
    const { data } = await axios.get<{ results: AninekoSearchResult[] }>(
      `${ANINEKO_API_URL}/search`,
      { params: { q: title }, timeout: 10000 }
    );
    return data?.results || [];
  } catch (error) {
    console.warn(`[Anineko] Search failed for "${title}":`, error instanceof Error ? error.message : error);
    return [];
  }
}

export async function fetchAninekoEpisodes(title: string, type?: string, titleRomaji?: string) {
  try {
    if (!ANINEKO_API_URL) return [];
    
    let bestMatch = null;

    const candidates = buildTitleCandidates(title, titleRomaji);

    for (const t of candidates) {
        console.log(`🔍 [Anineko] Searching for: "${t}"`);
        const results = await searchAninekoOnce(t);
        
        if (results.length > 0) {
            const match = findBestMatch(
              results,
              (r) => {
                let score = calculateSimilarity(r.title, title) * 0.85;
                if (type && r.type?.toLowerCase() === type.toLowerCase()) score += 0.15;
                return score;
              },
              0.6,
              'Anineko'
            );
            
            if (match) {
                bestMatch = match;
                break;
            }
        }
    }

    if (!bestMatch) {
      console.warn(`❌ [Anineko] No search results matching for "${title}"`);
      return [];
    }

    const { data: episodesData } = await axios.get<AninekoEpisodeItem[]>(
      `${ANINEKO_API_URL}/episodes`,
      { params: { slug: bestMatch.slug }, timeout: 15000 }
    );

    if (!Array.isArray(episodesData) || episodesData.length === 0) {
      console.warn(`⚠️ [Anineko] No episodes for slug "${bestMatch.slug}"`);
      return [];
    }

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