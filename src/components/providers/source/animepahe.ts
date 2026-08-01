import { ServerOption } from '@/types/stream';
import { VideoData } from '@/types/episode';

// AnimePahe không có bước /servers riêng trong pipeline hiện tại — CF worker trả thẳng
// nhiều quality (360p/480p/720p/1080p) trong 1 lần gọi, và UI hiện tại đã cho user chọn
// quality ở chỗ khác rồi -> KHÔNG cần ServerSelector cho pahe, trả mảng rỗng là đủ.
export async function listAnimePaheServers(): Promise<ServerOption[]> {
  return [];
}

export async function resolveAnimePaheSource(
  episodeid: string,
  animeId: string,
  epNum: number | string
): Promise<VideoData | null> {
  try {
    const proxyBase = process.env.ANIMEPAHE_PROXY || process.env.NEXT_PUBLIC_ANIMEPAHE_PROXY;
    if (!proxyBase) {
      console.error('❌ [AnimePahe] ANIMEPAHE_PROXY env not set');
      return null;
    }

    const workerUrl = new URL(`${proxyBase}/animepahe-source`);
    workerUrl.searchParams.set('episodeid', episodeid);
    workerUrl.searchParams.set('animeId', animeId);
    workerUrl.searchParams.set('epNum', String(epNum));
    workerUrl.searchParams.set('subtype', 'sub');

    const res = await fetch(workerUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store' as RequestCache,
    });

    if (!res.ok) {
      console.error(`❌ [AnimePahe] Worker returned ${res.status}`);
      return null;
    }

    const data = (await res.json()) as VideoData;
    if (!data?.sources?.length) {
      console.error('❌ [AnimePahe] No sources in worker response');
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ [AnimePahe] resolveAnimePaheSource error:', error instanceof Error ? error.message : error);
    return null;
  }
}
