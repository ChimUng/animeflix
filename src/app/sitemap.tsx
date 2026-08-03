import { TrendingAnilist, Top100Anilist, PopularThisSeason } from '@/lib/Anilistfunctions';

interface AnimeSitemapItem {
    id: string | number;
}

export default async function sitemap() {

    const baseUrl = process.env.NEXT_PUBLIC_DEV_URL;
    const currentDate = new Date();

    const DAILY = 'daily' as const;
    const WEEKLY = 'weekly' as const;
    const MONTHLY = 'monthly' as const;
    const YEARLY = 'yearly' as const;

    const data: AnimeSitemapItem[] = await TrendingAnilist();
    const data2: AnimeSitemapItem[] = await Top100Anilist();
    const data3: AnimeSitemapItem[] = await PopularThisSeason();

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