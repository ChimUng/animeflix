import axios from 'axios';
import { ServerOption, ServerType } from '@/types/stream';
import { VideoData } from '@/types/episode';

const ANINEKO_API_URL = process.env.ANINEKO_API_URL || '';
const ANINEKO_SERVER_PRIORITY = ['StreamHG', 'Earnvids'];
const BLOCKED_SERVERS = ['HD-1'];

interface AninekoServerRaw {
  server: string;
  type: string; // 'hsub' | 'sub' | 'dub'
  iframeUrl: string;
  domain: string;
  supported: boolean;
}

interface AninekoSourceResult {
  m3u8: string;
  referer: string;
  origin: string;
  subtitle: string | null;
  subtitleLabel: string | null;
  proxy_url: string;
}

function splitEpisodeId(episodeid: string): { animeSlug: string; episodeSlug: string } | null {
  const [animeSlug, episodeSlug] = episodeid.split('::');
  if (!animeSlug || !episodeSlug) return null;
  return { animeSlug, episodeSlug };
}

// Bước 3 — trả TOÀN BỘ server sub/hsub/dub cho user tự chọn (yêu cầu #3), sắp theo priority.
export async function listAninekoServers(episodeid: string): Promise<ServerOption[]> {
  if (!ANINEKO_API_URL) return [];
  const parsed = splitEpisodeId(episodeid);
  if (!parsed) return [];

  const { data: servers } = await axios.get<AninekoServerRaw[]>(`${ANINEKO_API_URL}/servers`, {
    params: { anime_slug: parsed.animeSlug, episode_slug: parsed.episodeSlug },
    timeout: 15000,
  });

  if (!Array.isArray(servers)) return [];

  return servers
    .filter((s) => s.supported && s.type !== 'hsub' && !BLOCKED_SERVERS.includes(s.server))
    .sort((a, b) => {
      const ai = ANINEKO_SERVER_PRIORITY.indexOf(a.server);
      const bi = ANINEKO_SERVER_PRIORITY.indexOf(b.server);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map((s) => ({
      key: `${s.type}:${s.server}`,
      label: s.server,
      type: s.type as ServerType,
      supported: s.supported,
      raw: s.iframeUrl,
    }));
}


// Bước 4 — resolve 1 iframeUrl cụ thể thành m3u8 proxy. Không truyền serverRaw -> tự thử
// lần lượt theo priority + fallback subtype (sub -> hsub) như logic cũ.
//
// ✅ FIX: trả thêm `resolvedServerKey` = key của candidate vừa resolve thành công, để
// PlayerComponent chạy listAninekoServers() (getServers) và resolveAninekoSource()
// (getSources) SONG SONG mà vẫn highlight đúng server trong ServerSelector.
export async function resolveAninekoSource(
  episodeid: string,
  subtype: string,
  serverRaw?: string
): Promise<VideoData | null> {
  try {
    if (!ANINEKO_API_URL) return null;

    let candidates: ServerOption[];
    if (serverRaw) {
      candidates = [{ key: 'manual', label: 'manual', type: subtype as ServerType, supported: true, raw: serverRaw }];
    } else {
      const all = await listAninekoServers(episodeid);
      const wantedTypes: ServerType[] = subtype === 'dub' ? ['dub'] : ['sub'];
      candidates = wantedTypes.flatMap((t) => all.filter((s) => s.type === t));
    }

    if (candidates.length === 0) return null;

    for (const candidate of candidates) {
      try {
        const { data } = await axios.get<AninekoSourceResult>(`${ANINEKO_API_URL}/source`, {
          params: { url: candidate.raw },
          timeout: 15000,
        });
        if (data?.m3u8 && data?.proxy_url) {
          return {
            sources: [{ url: data.proxy_url, isM3U8: true, type: 'hls' }],
            tracks: data.subtitle
              ? [{ url: data.subtitle, lang: data.subtitleLabel || 'English', kind: 'subtitles', default: true }]
              : [],
            headers: { Referer: data.referer },
            resolvedServerKey: candidate.key !== 'manual' ? candidate.key : undefined,
          };
        }
      } catch (err) {
        console.warn(`⚠️ [Anineko] Server ${candidate.label} failed:`, err instanceof Error ? err.message : err);
      }
    }

    return null;
  } catch (error) {
    console.error('❌ [Anineko] resolveAninekoSource error:', error instanceof Error ? error.message : error);
    return null;
  }
}