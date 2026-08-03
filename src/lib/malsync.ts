import axios from 'axios';
import { fetchAniZipMalId } from './anizip';

const baseUrl = () => {
  const url = process.env.MALSYNC_URI;
  if (!url) throw new Error('MALSYNC_URI environment variable is not set.');
  return url;
};

interface MalSyncSiteEntry {
  title: string;
  url?: string;
}

interface MalSyncRaw {
  Sites: Record<string, Record<string, MalSyncSiteEntry & Record<string, unknown>>>;
}

/**
 * Core: gọi MalSync API bằng id truyền vào; nếu fail, thử lại bằng cách coi id là Anilist id
 * và convert sang MAL id qua AniZip rồi gọi lại. Đây là NƠI DUY NHẤT gọi axios tới MalSync.
 */
async function fetchMalSyncRaw(id: number | string): Promise<MalSyncRaw | null> {
  try {
    const { data } = await axios.get<MalSyncRaw>(`${baseUrl()}${id}`);
    return data;
  } catch {
    console.log(`[MalSync] Failed for ID ${id}, thử fallback qua AniZip...`);
    const malId = await fetchAniZipMalId(id);
    if (!malId) return null;
    try {
      console.log(`[MalSync] Retry với MAL ID ${malId}`);
      const { data } = await axios.get<MalSyncRaw>(`${baseUrl()}${malId}`);
      return data;
    } catch {
      return null;
    }
  }
}

/**
 * Dùng cho api/source: lấy providerId (1 key) của 1 provider cụ thể.
 */
export async function getProviderId(id: number, provider: string): Promise<string> {
  const data = await fetchMalSyncRaw(id);
  if (!data) throw new Error(`Failed to get MalSync data for ID: ${id} after fallback.`);

  const keys = Object.keys(data.Sites?.[provider] || {});
  const providerId = keys.shift();
  if (!providerId) throw new Error(`Missing key for provider ${provider} in MalSync for ID: ${id}`);
  return providerId;
}

export interface MalSyncEpisodeMapping {
  providerId: 'gogoanime' | 'zoro';
  sub?: string;
  dub?: string;
}

/**
 * Dùng cho api/episode (route.tsx): lấy mapping sub/dub cho gogoanime + zoro cùng lúc.
 */
export async function getEpisodeProviderMapping(id: string): Promise<MalSyncEpisodeMapping[] | null> {
  const data = await fetchMalSyncRaw(id);
  if (!data?.Sites) {
    console.warn(`[MalSync] No Sites data for ID ${id}`);
    return null;
  }

  const sites = Object.keys(data.Sites).map((providerId) => ({
    providerId: providerId.toLowerCase(),
    entries: Object.values(data.Sites[providerId]),
  }));

  const mappings = sites
    .filter((s) => s.providerId === 'gogoanime' || s.providerId === 'zoro')
    .map((s): MalSyncEpisodeMapping => {
      if (s.providerId === 'gogoanime') {
        const remove = 'https://anitaku.to/category/';
        const dub = s.entries.find((d) => d.title.toLowerCase().endsWith(' (dub)'));
        const sub =
          s.entries.find((d) => d.title.toLowerCase().includes(' (uncensored)')) ||
          s.entries.find((d) => d?.url === dub?.url?.replace(/-dub$/, '')) ||
          s.entries.find((d) => !d.title.includes(')'));
        return {
          providerId: 'gogoanime',
          sub: sub?.url?.replace(remove, '') || '',
          dub: dub?.url?.replace(remove, '') || '',
        };
      }
      const remove = 'https://hianime.to/';
      return {
        providerId: 'zoro',
        sub: s.entries[0]?.url?.replace(remove, '') || '',
      };
    });

  if (mappings.length === 0) {
    console.warn(`[MalSync] No gogoanime/zoro mapping found for ID ${id}`);
    return null;
  }
  return mappings;
}

/**
 * api/source/route.tsx cũ.
 * Build animeEpisodeId theo doc Zoro: "<slug>?ep=<episodeid>".
 * Quy trình: 1) MalSync(anilistId)  2) fallback AniZip -> MAL ID -> MalSync lại.
 */
export async function buildZoroAnimeEpisodeId(
  anilistId: string,
  episodeid: string
): Promise<string | null> {
  let slug = await malSyncGetZoroSlug(anilistId);

  if (!slug) {
    const malId = await fetchAniZipMalId(anilistId);
    if (malId && malId !== anilistId) {
      slug = await malSyncGetZoroSlug(malId);
    }
  }

  if (!slug) return null;
  return `${slug}?ep=${episodeid}`;
}

async function malSyncGetZoroSlug(id: string | number): Promise<string | null> {
  try {
    const data = await fetchMalSyncRaw(id);
    if (!data?.Sites) return null;

    const sites = Object.keys(data.Sites).map((providerId) => ({
      providerId: providerId.toLowerCase(),
      entries: Object.values(data.Sites[providerId]),
    }));

    const zoroSite = sites.find((s) => s.providerId === 'zoro');
    if (!zoroSite) return null;

    const rawUrl = zoroSite.entries?.[0]?.url;
    if (!rawUrl) return null;

    const slug = rawUrl.replace(/^https?:\/\/(www\.)?hianime\.to\//i, '').replace(/^\/|\/$/g, '');
    return slug || null;
  } catch (error: unknown) {
    console.error('malSyncGetZoroSlug error:', (error as Error)?.message ?? error);
    return null;
  }
}
