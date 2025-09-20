import { NextResponse } from "next/server";
import { getAuthSession } from "@/app/api/auth/[...nextauth]/route";
import { getWatchHistory } from "@/lib/EpHistoryfunctions"; 
import { fetchRecentFromAnilist, RecentEpisode } from "../recent/route";

// Hàm fetch metadata từ AniList GraphQL
async function fetchAnimeMeta(animeId: string) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title {
          romaji
          english
        }
        genres
        tags {
          name
        }
      }
    }
  `;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { id: Number(animeId) } }),
  });

  const json = await res.json();
  return json.data?.Media || null;
}

export const GET = async () => {
  try {
    // 1. Xác thực user
    const session = await getAuthSession();
    if (!session?.user?.name) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. Lấy lịch sử xem từ MongoDB
    const history = await getWatchHistory();
    if (!history || history.length === 0) {
      return NextResponse.json({ message: "No watch history" }, { status: 404 });
    }

    // 3. Lấy metadata từ AniList để tính genres
    const genreCount: Record<string, number> = {};
    for (const item of history.slice(-5)) { // chỉ lấy 5 anime gần nhất
      const meta = await fetchAnimeMeta(item.aniId);
      if (meta?.genres) {
        meta.genres.forEach((g: string) => {
          genreCount[g] = (genreCount[g] || 0) + 1;
        });
      }
    }

    // 4. Lấy danh sách anime đang phát sóng (recent)
    const recentAnime = await fetchRecentFromAnilist();

    // 5. Tính điểm dựa trên số lần trùng genres
    const scored: (RecentEpisode & { score: number })[] = recentAnime.map((anime) => {
      let score = 0;
      if (anime.genres) {
        anime.genres.forEach((g: string) => {
          score += genreCount[g] || 0;
        });
      }
      return { ...anime, score };
    });

    // 6. Lọc & sort top recommendations
    const recommendations = scored
      .filter((a) => a.score > 0) // bỏ anime không liên quan
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error("❌ Error in recommendations API:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
};
