  import { NextRequest, NextResponse } from "next/server";
  import axios from "axios";
  import { redis } from "@/lib/rediscache";

  interface Anime {
    day: string;
    [key: string]: any;
  }

  const daysMap: Record<string, string> = {
    Sunday: "Chủ nhật",
    Monday: "Thứ hai",
    Tuesday: "Thứ ba",
    Wednesday: "Thứ tư",
    Thursday: "Thứ năm",
    Friday: "Thứ sáu",
    Saturday: "Thứ bảy",
  };

  function getWeekTimestampRange() {
    const now = new Date();
    const start = Math.floor(now.getTime() / 1000);

    // +7 ngày
    const future = new Date(now);
    future.setDate(now.getDate() + 7);
    const end = Math.floor(future.getTime() / 1000);

    return { start, end };
  }

  function getDayNameFromTimestamp(ts: number) {
    const date = new Date(ts * 1000);
    const enName = date.toLocaleDateString("en-US", { weekday: "long" });
    return daysMap[enName] || enName;
  }

  const query = `
    query($page: Int, $perPage: Int, $from: Int, $to: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          hasNextPage
        }
        airingSchedules(
          airingAt_greater: $from
          airingAt_lesser: $to
        ) {
          episode
          timeUntilAiring
          airingAt
          media {
            id
            title { romaji english native }
            coverImage { large }
            bannerImage
            format
            status
            episodes
            siteUrl
          }
        }
      }
    }
  `;

  export async function GET(req: NextRequest) {
    const cacheKey = "schedule:week";

    try {
      // 1️⃣ Check cache
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) return NextResponse.json(JSON.parse(cached));
      }

      // 2️⃣ Fetch AniList data với phân trang
      const { start, end } = getWeekTimestampRange();
      let page = 1;
      let allSchedules: any[] = [];

      while (true) {
        const res = await axios.post(
          "https://graphql.anilist.co",
          {
            query,
            variables: { page, perPage: 50, from: start, to: end },
          },
          { headers: { "Content-Type": "application/json" } }
        );

        const data = res.data?.data?.Page;
        if (!data) break;

        allSchedules = allSchedules.concat(data.airingSchedules);

        if (!data.pageInfo.hasNextPage) break;
        page++;
      }

      // 3️⃣ Map sang dữ liệu Anime
      const animes = allSchedules.map((item: any) => {
        const title = item.media.title;
        return {
          id: item.media.id,
          title: {
            romaji: title.romaji,
            english: title.english,
            native: title.native,
          },
          episode: item.episode,
          airingAt: item.airingAt,
          airingTime: new Date(item.airingAt * 1000).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          coverImage: item.media.coverImage.large,
          siteUrl: item.media.siteUrl,
          format: item.media.format,
          status: item.media.status,
          episodes: item.media.episodes,
          bannerImage: item.media.bannerImage,
          day: getDayNameFromTimestamp(item.airingAt),
        };
      });

      // 4️⃣ Gom nhóm để tính count theo ngày
      const counts = Object.values(daysMap).map((viName) => ({
        day: viName,
        count: animes.filter((a: Anime) => a.day === viName).length,
      }));

      const result = { days: counts, animes };

      // 5️⃣ Cache 24 tiếng
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(result), "EX", 60 * 60 * 24);
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ Error fetching schedule:", error);
      return NextResponse.json(
        { error: "Failed to fetch schedule" },
        { status: 500 }
      );
    }
  }
