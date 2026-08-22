import axios from 'axios';
import { NextResponse, NextRequest } from 'next/server';
import { redis } from '@/lib/rediscache';
import { ServerListResponse, ServerOption } from '@/types/stream';
import { VideoData } from '@/types/episode';
import { listZoroServers, resolveZoroSource } from '@/components/providers/source/zoro';
import { listNineAnimeServers, resolveNineAnimeSource } from '@/components/providers/source/nineanime';
import { listAnimePaheServers, resolveAnimePaheSource } from '@/components/providers/source/animepahe';
import { listAninekoServers, resolveAninekoSource } from '@/components/providers/source/anineko';
import { listAnimeHayServers, resolveAnimeHaySource } from '@/components/providers/source/animehay';

interface RequestBody {
  action: 'servers' | 'resolve';
  source?: string; // 'consumet' | 'anify' — chỉ dùng cho gogoanime (legacy)
  provider: string;
  episodeid: string;
  episodenum: number | string;
  subtype: string;
  serverRaw?: string;
  serverKey?: string;
}

// ✅ MỚI — cache resolve source theo HẠT MỊN (provider + episodeId + subtype + server cụ thể),
// KHÔNG gộp chung theo kiểu "toàn bộ provider" như cache episode listing (route.tsx danh sách
// tập), vì mỗi lần FE chỉ resolve đúng 1 server -> cache đúng key thực tế được gọi.
//
// TTL cố tình NGẮN (5 phút): link m3u8/iframe thường kèm token có hạn, cache dài sẽ trả link
// chết. Mục đích cache ở đây chỉ là dedupe khi nhiều user cùng xem 1 tập hot trong thời gian
// ngắn (giảm tải cho provider upstream), không phải cache lâu dài như metadata tập phim.
const SOURCE_CACHE_TTL = 60 * 5;

// ✅ MỚI — cache DANH SÁCH SERVER (tên server vd HD-1/StreamHG/Earnvids/AHS/HY...),
// KHÔNG PHẢI link m3u8/iframe thật (đó là SOURCE_CACHE_TTL ở trên). Danh sách server gần
// như không đổi theo thời gian (chỉ đổi khi provider thêm/bớt server hẳn), nên TTL có thể
// dài hơn nhiều mà không sợ trả dữ liệu chết như link có token hết hạn.
const SERVERS_CACHE_TTL = 60 * 1440; // 24 giờ

function buildSourceCacheKey(id: string, body: RequestBody): string {
  return `source:${body.provider}:${id}:${body.episodeid}:${body.subtype}:${body.serverRaw ?? 'auto'}`;
}

function buildServersCacheKey(id: string, body: RequestBody): string {
  return `servers:${body.provider}:${id}:${body.episodeid}`;
}

// legacy gogoanime/consumet — giữ nguyên hành vi cũ, không có bước "servers" riêng.
async function consumetEpisode(id: string): Promise<VideoData | null> {
  try {
    const { data } = await axios.get(`${process.env.CONSUMET_URI}/meta/anilist/watch/${id}`);
    return data;
  } catch (error) {
    console.error('consumetEpisode error:', error);
    return null;
  }
}

async function handleServers(id: string, body: RequestBody): Promise<ServerListResponse> {
  let servers: ServerOption[] = [];

  switch (body.provider) {
    case 'zoro':
      servers = await listZoroServers(id, body.episodeid);
      break;
    case '9anime':
      servers = await listNineAnimeServers();
      break;
    case 'animepahe':
      servers = await listAnimePaheServers();
      break;
    case 'anineko':
      servers = await listAninekoServers(body.episodeid);
      break;
    case 'animehay':
    case 'vietsub':
      servers = await listAnimeHayServers(body.episodeid);
      break;
    default:
      servers = []; // gogoanime/consumet: không có bước chọn server
  }

  return { providerId: body.provider, episodeId: body.episodeid, servers };
}

// ✅ MỚI — bọc handleServers bằng cache Redis (xem SERVERS_CACHE_TTL ở trên).
// Chỉ cache khi có ít nhất 1 server trả về, tránh cache "rỗng" đè lên kết quả tốt sau này
// (vd upstream tạm thời lỗi 1 lần lúc mới deploy).
async function handleServersCached(id: string, body: RequestBody): Promise<ServerListResponse> {
  const cacheKey = buildServersCacheKey(id, body);

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as ServerListResponse;
    } catch (err) {
      console.warn('⚠️ [api/source] Redis get error (servers):', err);
    }
  }

  const data = await handleServers(id, body);

  if (data.servers.length > 0 && redis) {
    try {
      await redis.setex(cacheKey, SERVERS_CACHE_TTL, JSON.stringify(data));
    } catch (err) {
      console.warn('⚠️ [api/source] Redis set error (servers):', err);
    }
  }

  return data;
}

async function resolveSourceUncached(id: string, body: RequestBody): Promise<VideoData | null> {
  const epnum = body.episodenum;

  switch (body.provider) {
    case 'zoro':
      return resolveZoroSource(id, body.episodeid, body.subtype, body.serverRaw);
    case '9anime':
      return resolveNineAnimeSource(id, body.episodeid, body.subtype, body.serverRaw);
    case 'animepahe':
      return resolveAnimePaheSource(body.episodeid, id, epnum);
    case 'anineko':
      return resolveAninekoSource(body.episodeid, body.subtype, body.serverRaw);
    case 'animehay':
    case 'vietsub':
      return resolveAnimeHaySource(body.episodeid, body.serverRaw);
    default:
      return consumetEpisode(body.episodeid);
  }
}

async function handleResolve(id: string, body: RequestBody): Promise<VideoData | null> {
  const cacheKey = buildSourceCacheKey(id, body);

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as VideoData;
    } catch (err) {
      console.warn('⚠️ [api/source] Redis get error:', err);
    }
  }

  const result = await resolveSourceUncached(id, body);

  if (result && redis) {
    try {
      await redis.setex(cacheKey, SOURCE_CACHE_TTL, JSON.stringify(result));
    } catch (err) {
      console.warn('⚠️ [api/source] Redis set error:', err);
    }
  }

  return result;
}

export const POST = async (
  req: NextRequest,
  context: { params: Promise<{ epsource: string[] }> }
): Promise<NextResponse> => {
  const { params } = context;
  const resolvedParams = await params;
  const id = resolvedParams.epsource[0];
  const body: RequestBody = await req.json();

  if (body.action === 'servers') {
    const data = await handleServersCached(id, body);
    return NextResponse.json(data);
  }

  const data = await handleResolve(id, body);
  if (!data) {
    return NextResponse.json({ error: 'No source found for this server' }, { status: 404 });
  }
  return NextResponse.json(data);
};