"use server";

import FilmFanStats from '@/mongodb/models/fanstats';
import { getAuthSession } from '@/app/api/auth/[...nextauth]/route';
import { connectMongo } from '@/mongodb/db';

/**
 * GỌI TỪ Addtolist.tsx NGAY LÚC USER BẤM YÊU THÍCH — đây là điểm TỐI ƯU:
 * thay vì đợi tới lúc user comment đủ 15 lần + cache cũ quá 24h mới hỏi lại
 * AniList (fetchIsFavourite), ta "biết trước" ngay tại đây vì chính hành
 * động Favourite vừa xảy ra thành công. Không cần gọi lại AniList nữa —
 * chỉ cần ghi thẳng kết quả đã biết vào Mongo, giúp badge hiện đúng sớm hơn
 * (không cần đợi user đủ 15 comment) và giảm số lần gọi AniList ở luồng
 * comment (vì tới lúc đó cache đã "tươi" sẵn rồi, cacheIsStale sẽ = false).
 *
 * Không cần token AniList ở đây vì không gọi mạng ra ngoài — chỉ ghi Mongo.
 *
 * Nằm ở FILE RIÊNG (không chung với FanStarsfuctions.ts) vì file "use server"
 * bắt buộc MỌI export đều phải là async function — không được lẫn hằng số
 * (FAN_CUNG_THRESHOLD) hay các hàm chỉ dùng nội bộ server-to-server.
 */
export async function syncFavouriteStatusAction(filmId: string, isFavourite: boolean): Promise<{ success: boolean }> {
  try {
    await connectMongo();
    const session = await getAuthSession();
    if (!session?.user?.id) return { success: false };

    await FilmFanStats.findOneAndUpdate(
      { filmId, userId: session.user.id },
      {
        $set: { isInAniListList: isFavourite, listCheckedAt: new Date() },
        $setOnInsert: { commentCount: 0 },
      },
      { upsert: true }
    );

    return { success: true };
  } catch (error) {
    console.error('Lỗi đồng bộ favourite status:', error);
    return { success: false };
  }
}