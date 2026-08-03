"use server"
import { trending, animeinfo, advancedsearch, top100anime, seasonal, popular, popularmovie, mostfavorite, weeklySchedule } from "./anilistqueries";

// Function to get the current season and year
const getCurrentSeasonAndYear = () => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    if (month <= 3) return { season: "WINTER", year };
    if (month <= 6) return { season: "SPRING", year };
    if (month <= 9) return { season: "SUMMER", year };
    return { season: "FALL", year };
};

// Function to get the next season and year
const getNextSeasonAndYear = () => {
    const seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    let currentSeasonIndex: number;
    if (month <= 3) currentSeasonIndex = 0;
    else if (month <= 6) currentSeasonIndex = 1;
    else if (month <= 9) currentSeasonIndex = 2;
    else currentSeasonIndex = 3;

    const nextSeasonIndex = (currentSeasonIndex + 1) % 4;
    const nextSeason = seasons[nextSeasonIndex];
    const nextYear = nextSeasonIndex === 0 ? year + 1 : year;

    return { season: nextSeason, year: nextYear };
};

export const TrendingAnilist = async () => {
    try {
        const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            query: trending,
            variables: { page: 1, perPage: 15 },
        }),
        next: { revalidate: 3600 },
        });

        const data = await res.json();
        return data.data.Page.media;
    } catch (err) {
        console.error("Error fetching trending:", err);
    }
};

export const PopularAnilist = async () => {
    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                query: popular,
                variables: {
                    page: 1,
                    perPage: 15,
                },
            }),
        next: { revalidate: 3600 }
        });

        const data = await response.json();
        return data.data.Page.media;
    } catch (error) {
        console.error('Error fetching popular data from AniList:', error);
    }
}

export const Top100Anilist = async () => {
    try {
        const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            query: top100anime,
            variables: { page: 1, perPage: 10 },
        }),
        next: { revalidate: 3600 },
        });

        const data = await res.json();
        return data.data.Page.media;
    } catch (err) {
        console.error("Error fetching top 100:", err);
    }
};

export const PopularThisSeason = async () => {
    const { season, year } = getCurrentSeasonAndYear();
    try {
        const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                query: seasonal,
                variables: { page: 1, perPage: 10, season, seasonYear: year }
            }),
            next: { revalidate: 3600 },
        });
        const data = await res.json();
        return data.data.Page.media;
    } catch (err) {
        console.error("Error fetching Popular This Season:", err);
        return [];
    }
};

export const PopularNextSeason = async () => {
    const { season, year } = getNextSeasonAndYear();
    try {
        const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                query: seasonal,
                variables: { page: 1, perPage: 12, season, seasonYear: year }
            }),
            next: { revalidate: 3600 },
        });
        const data = await res.json();
        return data.data.Page.media;
    } catch (err) {
        console.error("Error fetching Popular Next Season:", err);
        return [];
    }
};

export const PopularMovie = async () => {
    try {
        const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            query: popularmovie,
            variables: { page: 1, perPage: 10, type: "MOVIE" },
        }),
        next: { revalidate: 3600 },
        });

        const data = await res.json();
        return data.data.Page.media;
    } catch (err) {
        console.error("Error fetching popular movies:", err);
    }
};

export const MostFavoriteAnilist = async () => {
    try {
        const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            query: mostfavorite,
            variables: { page: 1, perPage: 10 },
        }),
        next: { revalidate: 3600 },
        });

        const data = await res.json();
        return data.data.Page.media;
    } catch (err) {
        console.error("Error fetching most favorite:", err);
    }
};

export const AnimeInfoAnilist = async (animeid: number | string) => {
    try {
        const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            query: animeinfo,
            variables: { id: animeid },
        }),
        next: { revalidate: 3600 },
        });

        const data = await res.json();
        return data.data.Media;
    } catch (err) {
        console.error("Error fetching anime info:", err);
    }
};

export const AdvancedSearch = async (
    searchvalue: string,
    selectedYear: number | null = null,
    seasonvalue: string | null = null,
    formatvalue: string | null = null,
    genrevalue: { type: string; value: string }[] = [],
    sortbyvalue: string | null = null,
    currentPage: number = 1,
    airingvalue: string | null = null 
    ) => {
    const types: Record<string, string[]> = {};

    for (const item of genrevalue) {
        const { type, value } = item;
        if (types[type]) {
        types[type].push(value);
        } else {
        types[type] = [value];
        }
    }
    try {
        const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
        query: advancedsearch,
        variables: {
            type: "ANIME",
            page: currentPage,
            ...(searchvalue && {
            search: searchvalue,
            sort: ["SEARCH_MATCH"],
            }),
            ...(selectedYear && { seasonYear: selectedYear }),
            ...(seasonvalue && { season: seasonvalue }),
            ...(formatvalue && { format: [formatvalue] }),
            ...(sortbyvalue && !searchvalue && { sort: [sortbyvalue] }),
            ...(airingvalue && { status: airingvalue }),
            ...(types && { ...types }),
        }
        }),
        next: { revalidate: 120 },
        });
 
        const data = await res.json();
        return data.data.Page;
    } catch (err) {
        console.error("Error in advanced search:", err);
        return null;
    }
};

export const WeeklyScheduleAnilist = async (from: number, to: number) => {
    try {
        const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                query: weeklySchedule,
                variables: { page: 1, perPage: 50, from, to },
            }),
            next: { revalidate: 3600 },
        });
        const data = await res.json();
        return data?.data?.Page?.airingSchedules ?? [];
    } catch (err) {
        console.error("Error fetching weekly schedule:", err);
        return [];
    }
};