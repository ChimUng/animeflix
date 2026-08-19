import FilmFanStats from '@/mongodb/models/fanstats';

export const FAN_CUNG_THRESHOLD = 15;
const RECHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h — đủ để cache "mát" mà không tra AniList liên tục

/**
 * Query AniList CỰC NHẸ: chỉ lấy field `isFavourite` của 1 Media, phản ánh đúng
 * trạng thái yêu thích của CHÍNH chủ token đang gọi. Không dùng UserProfile /
 * MediaListCollection (kéo cả list phim -> tốn kém hơn nhiều lần) vì ở đây ta
 * chỉ cần biết đúng 1 câu hỏi: "user X có yêu thích phim Y không?".
 */
async function fetchIsFavourite(token: string, aniId: number): Promise<boolean> {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        query: `query($id: Int){ Media(id: $id) { isFavourite } }`,
        variables: { id: aniId },
      }),
    });
    console.log('[fetchIsFavourite] aniId:', aniId, 'HTTP status:', res.status);
    const json = await res.json();
    console.log('[fetchIsFavourite] raw response:', JSON.stringify(json));

    if (json?.errors) {
      console.error('[fetchIsFavourite] AniList trả về GraphQL errors:', JSON.stringify(json.errors));
    }

    return !!json?.data?.Media?.isFavourite;
  } catch (err) {
    console.error('[fetchIsFavourite] Lỗi kiểm tra isFavourite từ AniList:', err);
    return false; 
  }
}
export async function trackCommentAndMaybeVerifyFan(params: {
  userId: string;
  filmId: string;
  aniId: number;
  token?: string;
}) {
  const { userId, filmId, aniId, token } = params;

  const stats = await FilmFanStats.findOneAndUpdate(
    { filmId, userId },
    { $inc: { commentCount: 1 } },
    { upsert: true, new: true }
  );

  const now = Date.now();
  const cacheIsStale =
    !stats.listCheckedAt || now - new Date(stats.listCheckedAt).getTime() > RECHECK_INTERVAL_MS;

  console.log('[trackCommentAndMaybeVerifyFan] check điều kiện:', {
    userId,
    filmId,
    aniId,
    commentCount: stats.commentCount,
    meetsThreshold: stats.commentCount >= FAN_CUNG_THRESHOLD,
    cacheIsStale,
    hasToken: !!token,
    aniIdIsFinite: Number.isFinite(aniId),
  });

  if (stats.commentCount >= FAN_CUNG_THRESHOLD && cacheIsStale && token && Number.isFinite(aniId)) {
    console.log('[trackCommentAndMaybeVerifyFan] -> Đủ điều kiện, đang gọi AniList...');
    const isFav = await fetchIsFavourite(token, aniId);
    console.log('[trackCommentAndMaybeVerifyFan] -> Kết quả isFav:', isFav);
    stats.isInAniListList = isFav;
    stats.listCheckedAt = new Date();
    await stats.save();
  } else {
    console.log('[trackCommentAndMaybeVerifyFan] -> BỎ QUA, không gọi AniList (xem lý do ở object trên)');
  }

  return stats;
}

/**
 * GỌI KHI RENDER DANH SÁCH COMMENT (luồng READ) — KHÔNG BAO GIỜ gọi AniList ở
 * đây. Chỉ đọc cache đã lưu trong Mongo, batch 1 query duy nhất cho toàn bộ
 * userId xuất hiện trong trang đang render (tránh N+1 query).
 */
export async function getFanBadgeMap(filmId: string, userIds: string[]): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  const uniqueIds = Array.from(new Set(userIds));
  if (uniqueIds.length === 0) return map;

  const rows = await FilmFanStats.find({ filmId, userId: { $in: uniqueIds } }).lean();
  for (const row of rows) {
    const isFan = row.commentCount >= FAN_CUNG_THRESHOLD && row.isInAniListList;
    map.set(String(row.userId), isFan);
  }
  return map;
}