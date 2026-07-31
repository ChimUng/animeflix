import axios from 'axios';
import { Episode, Provider } from '@/types/episode';

interface NineAnimeRaw {
  success: boolean;
  results: {
    totalEpisodes: number;
    episodes: Array<{ episode_no: number; id: string; title: string; japanese_title?: string; filler: boolean }>;
  };
}

export async function fetch9animeEpisodes(id: string): Promise<Provider[]> {
  if (!id) return [];
  try {
    const { data } = await axios.get<NineAnimeRaw>(`${process.env.ZENIME_URL}/api/episodes/${id}`);

    if (!data.success || !data.results?.episodes?.length) {
      console.warn(`⚠️ [9anime] No episodes for ID ${id}`);
      return [];
    }

    const episodes: Episode[] = data.results.episodes.map((ep) => ({
      number: ep.episode_no,
      id: ep.id,
      title: ep.title || ep.japanese_title || undefined,
      isFiller: ep.filler,
    }));

    return [{ providerId: '9anime', id: '9anime', episodes }];
  } catch (error) {
    console.error(`Error fetching 9anime for ID ${id}:`, error instanceof Error ? error.message : error);
    return [];
  }
}