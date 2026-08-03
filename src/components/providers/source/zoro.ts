import axios from 'axios';
import { buildZoroAnimeEpisodeId } from '@/lib/malsync';
import { ServerOption, ServerType } from '@/types/stream';
import { VideoData } from '@/types/episode';

interface ZoroServerRaw {
  serverName: string;
  serverId?: number;
}

async function resolveAnimeEpisodeId(anilistId: string, episodeid: string): Promise<string> {
  if (episodeid.includes('?ep=')) return episodeid;
  const built = await buildZoroAnimeEpisodeId(anilistId, episodeid);
  return built ?? episodeid;
}

// Bước 3: lấy toàn bộ server sub + dub, KHÔNG chọn sẵn — trả về cho FE tự chọn (yêu cầu #3).
export async function listZoroServers(
  anilistId: string,
  episodeid: string
): Promise<ServerOption[]> {
  const animeEpisodeId = await resolveAnimeEpisodeId(anilistId, episodeid);

  const { data } = await axios.get(`${process.env.ZORO_URI}/episode/servers`, {
    params: { animeEpisodeId },
  });

  const serverData = data?.data as Record<ServerType, ZoroServerRaw[]> | undefined;
  if (!serverData) return [];

  const types: ServerType[] = ['sub', 'dub'];
  const servers: ServerOption[] = [];
  for (const type of types) {
    (serverData[type] || []).forEach((s) => {
      servers.push({
        key: `${type}:${s.serverName}`,
        label: s.serverName,
        type,
        supported: true,
        raw: `${animeEpisodeId}::${type}::${s.serverName}`,
      });
    });
  }
  return servers;
}

// Bước 4: resolve 1 server cụ thể. serverRaw = "<animeEpisodeId>::<type>::<serverName>".
// Nếu không truyền server (lần load đầu) -> mặc định server đầu tiên của đúng subtype.
//
// ✅ FIX: trả thêm `resolvedServerKey` khi backend TỰ CHỌN server (không có serverRaw truyền
// vào) — cho phép PlayerComponent gọi listZoroServers() (getServers) và resolveZoroSource()
// (getSources) SONG SONG ở lần load đầu mà vẫn biết chính xác nút nào cần highlight trong
// ServerSelector, thay vì phải đợi listZoroServers() xong rồi mới resolve tuần tự.
export async function resolveZoroSource(
  anilistId: string,
  episodeid: string,
  subtype: string,
  serverRaw?: string
): Promise<VideoData | null> {
  try {
    let animeEpisodeId: string;
    let category = subtype;
    let serverName: string | undefined;
    let resolvedServerKey: string | undefined;

    if (serverRaw) {
      [animeEpisodeId, category, serverName] = serverRaw.split('::');
    } else {
      animeEpisodeId = await resolveAnimeEpisodeId(anilistId, episodeid);
      const servers = await listZoroServers(anilistId, episodeid);
      const first = servers.find((s) => s.type === category) ?? servers[0];
      if (!first) return null;
      [, , serverName] = first.raw.split('::');
      resolvedServerKey = first.key;
    }

    const sourceRes = await axios.get(`${process.env.ZORO_URI}/episode/sources`, {
      params: { animeEpisodeId, server: serverName, category },
    });

    const data = (sourceRes.data?.data as VideoData) ?? null;
    if (!data) return null;

    return resolvedServerKey ? { ...data, resolvedServerKey } : data;
  } catch (error) {
    console.error('❌ [Zoro] resolveZoroSource error:', error instanceof Error ? error.message : error);
    return null;
  }
}