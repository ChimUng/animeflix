import axios from 'axios';
import { ServerOption } from '@/types/stream';
import { VideoData } from '@/types/episode';

const ANIMEHAY_API_URL = process.env.ANIMEHAY_API_URL || '';
const ANIMEHAY_SERVER_PRIORITY = ['AHS', 'HY'];

interface AnimeHayServerRaw {
  serverKey: string;
  serverName: string;
  badge: string;
  iframeUrl: string;
  domain: string;
  supported: boolean;
}

interface AnimeHaySourceResult {
  m3u8: string;
  referer: string;
  origin: string;
  proxy_url: string;
}

function splitEpisodeId(episodeid: string) {
  // Format: "{animeSlug}::{animeId}::{episodeId}::{epNum}"
  const parts = episodeid.split('::');
  if (parts.length !== 4) return null;
  const [animeSlug, animeId, episodeId, epNumStr] = parts;
  return { animeSlug, animeId, episodeId, epNum: parseFloat(epNumStr) };
}

// animehay chỉ có 1 luồng "vietsub" (không phân sub/dub) -> mọi server đều type 'sub'.
export async function listAnimeHayServers(episodeid: string): Promise<ServerOption[]> {
  if (!ANIMEHAY_API_URL) return [];
  const parsed = splitEpisodeId(episodeid);
  if (!parsed) return [];

  const { data } = await axios.get<AnimeHayServerRaw[]>(`${ANIMEHAY_API_URL}/servers`, {
    params: {
      anime_slug: parsed.animeSlug,
      episode_id: parsed.episodeId,
      ep_num: isNaN(parsed.epNum) ? undefined : parsed.epNum,
    },
    timeout: 15000,
  });

  if (!Array.isArray(data)) return [];

  return data
    .filter((s) => s.supported)
    .sort((a, b) => {
      const ai = ANIMEHAY_SERVER_PRIORITY.indexOf(a.serverKey);
      const bi = ANIMEHAY_SERVER_PRIORITY.indexOf(b.serverKey);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map((s) => ({
      key: s.serverKey,
      label: `${s.serverKey} (${s.badge})`,
      type: 'sub' as const,
      supported: s.supported,
      raw: s.iframeUrl,
    }));
}

export async function resolveAnimeHaySource(episodeid: string, serverRaw?: string): Promise<VideoData | null> {
  try {
    if (!ANIMEHAY_API_URL) return null;

    const candidates: ServerOption[] = serverRaw
      ? [{ key: 'manual', label: 'manual', type: 'sub', supported: true, raw: serverRaw }]
      : await listAnimeHayServers(episodeid);

    if (candidates.length === 0) return null;

    for (const candidate of candidates) {
      try {
        const { data } = await axios.get<AnimeHaySourceResult>(`${ANIMEHAY_API_URL}/source`, {
          params: { url: candidate.raw },
          timeout: 15000,
        });
        if (data?.m3u8 && data?.proxy_url) {
          return {
            sources: [{ url: data.proxy_url, isM3U8: true, type: 'hls', quality: candidate.key }],
            tracks: [],
            headers: { Referer: data.referer, 'x-provider': 'animehay' },
          };
        }
      } catch (err) {
        console.warn(`⚠️ [AnimeHay] Server ${candidate.key} failed:`, err instanceof Error ? err.message : err);
      }
    }

    return null;
  } catch (error) {
    console.error('❌ [AnimeHay] resolveAnimeHaySource error:', error instanceof Error ? error.message : error);
    return null;
  }
}
