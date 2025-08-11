import React from 'react';
import { Metadata } from 'next';
import Navbarcomponent from '@/components/navbar/Navbar';
import DetailsContainer from './DetailsContainer';
import { getAuthSession } from '@/app/api/auth/[...nextauth]/route';
import { AnimeInfoAnilist } from '@/lib/Anilistfunctions';
import { redis } from '@/lib/rediscache';

// Interface for params passed from router
interface Params {
  params: Promise<{
    infoid: string[]; // [id] is an array of strings from dynamic route
  }>;
}

// Function to fetch anime info with Redis caching
async function getInfo(id: number | string) {
  try {
    let cachedData: string | null = null;

    if (redis) {
      cachedData = await redis.get(`info:${id}`);
      const parsedData = cachedData ? JSON.parse(cachedData) : null;

      if (!parsedData) {
        await redis.del(`info:${id}`);
      } else {
        return parsedData;
      }
    }

    const data = await AnimeInfoAnilist(id);
    const cacheTime = data?.nextAiringEpisode?.episode
      ? 60 * 60 * 2 // 2 hours if there’s an upcoming episode
      : 60 * 60 * 24 * 45; // 45 days if none

    if (redis && data) {
      await redis.set(`info:${id}`, JSON.stringify(data), 'EX', cacheTime);
    }

    return data;
  } catch (error) {
    console.error("Error fetching info: ", error);
    return null;
  }
}

// SEO Metadata generation
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolvedParams = await params; // Await params
  const id = resolvedParams.infoid[0];
  const data = await getInfo(id);

  return {
    title: data?.title?.english || data?.title?.romaji || 'Loading...',
    description: data?.description?.slice(0, 180),
    openGraph: {
      title: data?.title?.english || data?.title?.romaji,
      images: [data?.coverImage?.extraLarge],
      description: data?.description,
    },
    twitter: {
      card: 'summary',
      title: data?.title?.english || data?.title?.romaji,
      description: data?.description?.slice(0, 180),
    },
  };
}

// Anime Details Page
const AnimeDetails = async ({ params }: Params) => {
  const resolvedParams = await params; // Await params
  const session = await getAuthSession();
  const id = Number(resolvedParams.infoid[0]);

  const data = await AnimeInfoAnilist(id);
  if (!data) return <div>Error loading anime.</div>;

  return (
    <div className="">
      <Navbarcomponent />
      <DetailsContainer data={data} id={id} session={session} />
    </div>
  );
};

export default AnimeDetails;