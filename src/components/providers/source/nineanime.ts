import axios from 'axios';
import { buildZoroAnimeEpisodeId } from '@/lib/malsync';
import { ServerOption } from '@/types/stream';
import { VideoData } from '@/types/episode';

async function resolveAnimeEpisodeId(anilistId: string, episodeid: string): Promise<string> {
  if (episodeid.includes('?ep=')) return episodeid;
  const built = await buildZoroAnimeEpisodeId(anilistId, episodeid);
  return built ?? episodeid;
}

// 9anime (zenime) hiện chỉ expose 1 server cố định "hd-1" theo API đang xài -> vẫn trả
// về dạng ServerOption[] để đồng nhất contract, đơn giản là list có 1 phần tử mỗi subtype.
export async function listNineAnimeServers(): Promise<ServerOption[]> {
  return [
    { key: 'sub:hd-1', label: 'HD-1', type: 'sub', supported: true, raw: 'hd-1::sub' },
    { key: 'dub:hd-1', label: 'HD-1', type: 'dub', supported: true, raw: 'hd-1::dub' },
  ];
}

// ✅ FIX: trả thêm `resolvedServerKey` (luôn xác định được ngay vì 9anime chỉ có 1 server
// cố định mỗi subtype) để đồng nhất contract VideoData với các provider khác, cho phép
// PlayerComponent chạy getServers + getSources song song ở mọi provider.
export async function resolveNineAnimeSource(
  anilistId: string,
  episodeid: string,
  subtype: string,
  serverRaw?: string
): Promise<VideoData | null> {
  try {
    const animeEpisodeId = await resolveAnimeEpisodeId(anilistId, episodeid);
    const [server, category] = (serverRaw ?? `hd-1::${subtype}`).split('::');

    const streamRes = await axios.get(`${process.env.ZENIME_URL}/api/stream`, {
      params: { id: animeEpisodeId, server, type: category },
    });

    const streamData = streamRes.data;
    if (!streamData?.success || !streamData?.results?.streamingLink) return null;

    const streamingLink = streamData.results.streamingLink;
    const firstStream = Array.isArray(streamingLink) ? streamingLink[0] : streamingLink;
    if (!firstStream) return null;

    const fileUrl = typeof firstStream.link === 'string' ? firstStream.link : firstStream.link?.file;
    if (!fileUrl) return null;

    const tracks = streamData.results.tracks ?? firstStream.tracks ?? [];

    return {
      sources: [{ url: fileUrl, isM3U8: firstStream.type === 'hls', type: firstStream.type }],
      tracks: tracks.map((track: { file: string; label: string; kind: string; default?: boolean }) => ({
        url: track.file,
        lang: track.label,
        kind: track.kind,
        default: track.default,
      })),
      intro: streamData.results.intro ?? firstStream.intro,
      outro: streamData.results.outro ?? firstStream.outro,
      headers: { Referer: 'https://rapid-cloud.co/' },
      resolvedServerKey: `${category}:${server}`,
    };
  } catch (error) {
    console.error('❌ [9anime] resolveNineAnimeSource error:', error instanceof Error ? error.message : error);
    return null;
  }
}