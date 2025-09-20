import { TrendingAnilist, Top100Anilist, SeasonalAnilist } from '@/lib/Anilistfunctions';

// Định nghĩa một interface cho cấu trúc dữ liệu anime cần thiết cho sitemap
interface AnimeSitemapItem {
  id: string | number; // Hoặc kiểu dữ liệu cụ thể của ID anime từ API của bạn
  // Có thể thêm các thuộc tính khác nếu bạn sử dụng chúng, ví dụ: title, slug, v.v.
}

// interface GenreSitemapItem {
//     slug: string;
// }

// interface YearSitemapItem {
//     year: number;
// }
export default async function sitemap() {
    // Lấy baseUrl từ biến môi trường
    // Sử dụng một giá trị mặc định nếu biến môi trường không được định nghĩa (ví dụ: trong quá trình build mà không có env file)
    const baseUrl = process.env.NEXT_PUBLIC_DEV_URL;
    const currentDate = new Date();

    const DAILY = 'daily' as const;
    const WEEKLY = 'weekly' as const;
    const MONTHLY = 'monthly' as const;
    const YEARLY = 'yearly' as const;

  // Đảm bảo rằng các hàm TrendingAnilist, Top100Anilist, SeasonalAnilist trả về Promise<AnimeSitemapItem[]>
    const data: AnimeSitemapItem[] = await TrendingAnilist();
    const data2: AnimeSitemapItem[] = await Top100Anilist();
    const data3: AnimeSitemapItem[] = await SeasonalAnilist();

    const trending = data.map((anime: AnimeSitemapItem) => {
        return {
            url: `${baseUrl}/anime/info/${anime.id}`,
            lastModified: new Date(),
            changeFrequency: DAILY,
            priority: 0.8,
        };
    });

    const top100 = data2.map((anime: AnimeSitemapItem) => {
        return {
            url: `${baseUrl}/anime/info/${anime.id}`,
            lastModified: new Date(),
            changeFrequency: WEEKLY,
            priority: 0.7,
        };
    });

    const seasonal = data3.map((anime: AnimeSitemapItem) => {
        return {
            url: `${baseUrl}/anime/info/${anime.id}`,
            lastModified: new Date(),
            changeFrequency: MONTHLY,
            priority: 0.7,
        };
    });

    const staticUrls = [
        {
        url: `${baseUrl}/anime/catalog`,
        lastModified: currentDate,
        changeFrequency: MONTHLY,
        priority: 0.5,
        },
        {
        url: `${baseUrl}/anime/topanime`,
        lastModified: currentDate,
        changeFrequency: MONTHLY,
        priority: 0.5,
        },
        {
        url: `${baseUrl}/anime/schedule`,
        lastModified: currentDate,
        changeFrequency: YEARLY,
        priority: 0.3,
        },
    ];
    
    return [
        {
            url: `${baseUrl}`,
            lastModified: new Date(),
            changeFrequency: YEARLY,
            priority: 1,
        },
        ...trending,
        ...top100,
        ...seasonal,
        ...staticUrls,
    ];
}