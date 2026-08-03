import { Episode, Provider, EpisodeMeta } from '@/types/episode';

function isGenericEpisodeTitle(title: string | undefined, number: number): boolean {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  return (
    t === `episode ${number}` ||
    t === `tập ${number}` ||
    t === `ep ${number}` ||
    t === ''
  );
}

export async function CombineEpisodeMeta(
  episodeData: Provider[],
  imageData: EpisodeMeta[]
): Promise<Provider[]> {
  const episodeImages: Record<number, EpisodeMeta> = {};

  imageData.forEach((image) => {
    const key = image.number ?? image.episode;
    if (key !== undefined) {
      if (episodeImages[key] === undefined) {
        episodeImages[key] = image;
      }
    }
  });

  for (const providerEpisodes of episodeData) {
    const episodesArray = Array.isArray(providerEpisodes.episodes)
      ? providerEpisodes.episodes
      : [
          ...(providerEpisodes.episodes.sub || []),
          ...(providerEpisodes.episodes.dub || []),
        ];

    for (const episode of episodesArray) {
      const imageInfo = episodeImages[episode.number];
      if (!imageInfo) continue;

      if (!episode.img) {
        episode.img = imageInfo.img || imageInfo.image;
      }

      if (isGenericEpisodeTitle(episode.title, episode.number)) {
        let anizipTitle: string | undefined;
        if (typeof imageInfo.title === 'object') {
          anizipTitle = imageInfo.title?.en || imageInfo.title?.ja;
        } else {
          anizipTitle = imageInfo.title;
        }
        if (anizipTitle) episode.title = anizipTitle;
      }

      if (!episode.description) {
        episode.description = imageInfo.description || imageInfo.overview || imageInfo.summary;
      }

      if (episode.rating === undefined && imageInfo.rating !== undefined) {
        episode.rating = imageInfo.rating;
      }
    }
  }

  return episodeData;
}

/**
 * Chỉ dùng để chọn defaultProvider LẦN ĐẦU khi episodeData mới load.
 * KHÔNG dùng để tính suboptions hiển thị nữa -> dùng getSubOptionsForProvider() bên dưới,
 * gọi lại mỗi khi defaultProvider đổi (xem Episodesection.tsx).
 */
export function ProvidersMap(
  episodeData: Provider[] | null,
  defaultProvider: string | null = null,
  setDefaultProvider: (providerId: string) => void = () => {}
): void {
  if (!episodeData || episodeData.length === 0) {
    if (!defaultProvider) setDefaultProvider('default');
    return;
  }

  if (!defaultProvider) {
    const dProvider = episodeData.find((i) => i?.consumet === true);
    setDefaultProvider(dProvider?.providerId || episodeData[0]?.providerId || 'default');
  }
}

/**
 * Provider dạng mảng phẳng (animepahe/anineko/zoro/animehay/9anime) KHÔNG tách sẵn 2 mảng
 * sub/dub như Gogoanime (consumet) -> phải tự suy ra từ `episode.badges` khi có.
 *
 * Hiện tại CHỈ anineko trả badges (["SUB","DUB","HSUB"] mỗi tập) — dữ liệu này có FREE trong
 * chính response /episodes (bước 2 trong flow_anineko_data.txt), KHÔNG cần gọi thêm /servers
 * cho từng tập chỉ để biết có dub hay không (gọi /servers chỉ nên làm ở trang watch, khi user
 * đã bấm vào 1 tập cụ thể — làm ở đây vừa tốn quota vừa chậm listing).
 *
 * Provider không có badges (animepahe/zoro/animehay/9anime) -> mặc định chỉ 'sub'.
 */
function computeFlatArrayOptions(episodes: Episode[]): { suboptions: string[]; dubLength: number } {
  const hasBadgeInfo = episodes.some((ep) => Array.isArray(ep.badges));

  if (!hasBadgeInfo) {
    return { suboptions: ['sub'], dubLength: 0 };
  }

  const hasSub = episodes.some((ep) => ep.badges?.some((b) => b === 'SUB' || b === 'HSUB'));
  const dubEpisodes = episodes.filter((ep) => ep.badges?.includes('DUB'));

  const suboptions: string[] = [];
  if (hasSub) suboptions.push('sub');
  if (dubEpisodes.length > 0) suboptions.push('dub');
  if (suboptions.length === 0) suboptions.push('sub');

  return { suboptions, dubLength: dubEpisodes.length };
}

/**
 * Tính suboptions (sub/dub) + dubLength CHO ĐÚNG provider đang được chọn.
 * Gọi lại mỗi khi defaultProvider thay đổi.
 */
export function getSubOptionsForProvider(
  provider?: Provider | null
): { suboptions: string[]; dubLength: number } {
  if (!provider) return { suboptions: ['sub'], dubLength: 0 };

  const { episodes } = provider;

  if (Array.isArray(episodes)) {
    return computeFlatArrayOptions(episodes);
  }

  const subEpisodes = episodes.sub ?? [];
  const dubEpisodes = episodes.dub ?? [];

  const suboptions: string[] = [];
  if (subEpisodes.length > 0) suboptions.push('sub');
  if (dubEpisodes.length > 0) suboptions.push('dub');
  if (suboptions.length === 0) suboptions.push('sub');

  const dubLength = dubEpisodes.length > 0 ? Math.max(...dubEpisodes.map((e) => e.number), 0) : 0;

  return { suboptions, dubLength };
}

export function getGlobalSubDubOptions(providers: Provider[] | null): string[] {
  if (!providers?.length) return [];
  const set = new Set<string>();
  providers.forEach((p) => {
    if (Array.isArray(p.episodes)) {
      const { suboptions } = computeFlatArrayOptions(p.episodes);
      suboptions.forEach((o) => set.add(o));
    } else {
      if (p.episodes.sub?.length) set.add('sub');
      if (p.episodes.dub?.length) set.add('dub');
    }
  });
  return Array.from(set);
}

/**
 * ✅ MỚI — hàm lọc episode theo subtype (sub/dub), DÙNG CHUNG cho Episodesection.tsx
 * và PlayerEpisodeList.tsx (trước đây 2 nơi viết logic riêng và bị lệch nhau:
 * Episodesection lọc badges đúng, PlayerEpisodeList không lọc gì cho provider dạng
 * mảng phẳng -> hiện sai tập khi đổi dub cho anineko).
 *
 * Logic:
 * - Provider dạng consumet (gogoanime) đã tách sẵn { sub, dub } -> trả thẳng mảng tương ứng.
 * - Provider dạng mảng phẳng CÓ badges (anineko) -> subtype 'dub' lọc theo badge DUB,
 *   subtype 'sub' trả nguyên mảng (giữ đúng hành vi cũ của Episodesection).
 * - Provider dạng mảng phẳng KHÔNG có badges (animepahe/animehay/zoro/9anime) -> luôn
 *   coi là 'sub', trả nguyên mảng cho 'sub' và mảng rỗng cho 'dub'.
 */
export function filterEpisodesBySubtype(
  provider: Provider | null | undefined,
  subtype: string
): Episode[] {
  if (!provider) return [];
  const { episodes } = provider;

  if (provider.consumet && !Array.isArray(episodes)) {
    return subtype === 'sub' ? episodes.sub ?? [] : episodes.dub ?? [];
  }

  if (Array.isArray(episodes)) {
    const hasBadgeInfo = episodes.some((ep) => Array.isArray(ep.badges));
    if (!hasBadgeInfo) {
      // Không có badge info => provider chỉ có 1 luồng, luôn coi là 'sub'.
      return subtype === 'dub' ? [] : episodes;
    }
    return subtype === 'dub'
      ? episodes.filter((ep) => ep.badges?.includes('DUB'))
      : episodes;
  }

  // Phòng hờ shape lạ (không nên xảy ra với domain type hiện tại)
  return subtype === 'sub' ? episodes.sub ?? [] : episodes.dub ?? [];
}

export type { Episode, Provider, EpisodeMeta };
export type { VideoSource, VideoTrack, VideoTimeRange, VideoData } from '@/types/episode';