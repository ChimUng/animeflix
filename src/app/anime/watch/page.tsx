import React from "react";
import { Metadata } from "next";
import { Session } from "next-auth";
import { AnimeInfoAnilist } from "@/lib/Anilistfunctions";
import NextAiringDate from "@/components/videoplayer/NextAiringDate";
import PlayerAnimeCard from "@/components/videoplayer/PlayerAnimeCard";
import PlayerAnimeInfo from "@/components/videoplayer/PlayerAnimeInfo";
import Navbarcomponent from "@/components/navbar/Navbar";
import PlayerComponent from "@/components/videoplayer/PlayerComponent";
import Animecards from "@/components/CardComponent/Animecards";
import { createWatchEp, getEpisode } from "@/lib/EpHistoryfunctions";
import { redis } from "@/lib/rediscache";
import { AnimeItem } from "@/lib/types";
import { getAuthSession } from "../../api/auth/[...nextauth]/route";
import { IWatch } from "@/mongodb/models/watch";

// Interface cho SavedEpisode (khớp với player.tsx)
interface SavedEpisode {
  timeWatched: number;
}

export interface PageProps {
  searchParams: {
    id?: string;
    host?: string;
    ep?: string;
    epid?: string;
    type?: string;
  };
}

async function getInfo(id: string): Promise<AnimeItem | null> {
  try {
    if (redis) {
      const cachedData = await redis.get(`info:${id}`);
      if (cachedData) return JSON.parse(cachedData);
    }
    const data = await AnimeInfoAnilist(id);
    const cacheTime = data?.nextAiringEpisode?.episode
      ? 60 * 60 * 2
      : 60 * 60 * 24 * 45;
    if (redis && data) {
      await redis.set(`info:${id}`, JSON.stringify(data), "EX", cacheTime);
    }
    return data;
  } catch (error) {
    console.error("Error fetching info: ", error);
    return null;
  }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams; // ✅ phải await trong Next.js 15
  const id = params.id || "";
  const data = await getInfo(id);
  const epnum = params.ep || "1";

  const title = `Episode ${epnum} - ${data?.title?.english || data?.title?.romaji || "Anime"}`;
  const description = data?.description?.slice(0, 180) || "Xem anime Online.";

  return {
    title,
    description,
    openGraph: {
      title,
      images: [data?.coverImage?.extraLarge || ""],
      description: data?.description || description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [data?.coverImage?.extraLarge || ""],
    },
  };
}

async function Ephistory(session: any, aniId: string, epNum: number): Promise<void | IWatch[] | null> {
  try {
    if (session && aniId && epNum) {
      await createWatchEp(aniId, epNum);
      return await getEpisode(aniId, epNum);
    }
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function AnimeWatch({ searchParams }: PageProps) {
  const params = await searchParams; // ✅ phải await
  const session = await getAuthSession();
  const id = params.id || "";
  const provider = params.host || "gogoanime";
  const epNum = params.ep || "1";
  const epId = params.epid || "";
  const subdub = params.type || "sub";

  if (!id || !epId) {
    return <div>Error: Missing required parameters.</div>;
  }

  const data = await getInfo(id);
  const savedepRaw = await Ephistory(session, id, parseInt(epNum));

  // Chuyển đổi savedep sang SavedEpisode[]
  const savedep: SavedEpisode[] = Array.isArray(savedepRaw)
    ? savedepRaw
        .filter((item) => item.timeWatched != null)
        .map((item) => ({
          timeWatched: item.timeWatched!,
        }))
    : [];

  return (
    <>
      <Navbarcomponent />
      <div className="w-full flex flex-col lg:flex-row lg:max-w-[98%] mx-auto xl:max-w-[94%] lg:gap-[6px] mt-[70px]">
        <div className="flex-grow w-full h-full">
          <PlayerComponent
            id={id}
            epId={epId}
            provider={provider}
            epNum={epNum}
            subdub={subdub}
            data={data}
            session={session}
            savedep={savedep}
          />
          {data?.status === "RELEASING" && data.nextAiringEpisode && (
            <NextAiringDate nextAiringEpisode={data.nextAiringEpisode} />
          )}
        </div>
        <div className="h-full lg:flex lg:flex-col md:max-lg:w-full gap-10">
          <div className="rounded-lg hidden lg:block lg:max-w-[280px] xl:max-w-[380px] w-full xl:overflow-y-scroll xl:overflow-x-hidden overflow-hidden scrollbar-hide">
            <PlayerAnimeCard data={data?.recommendations?.nodes} id="Đề xuất" />
          </div>
        </div>
        {/* <div className="lg:hidden">
          <Animecards 
            data={data?.recommendations?.nodes?.map(item => item.mediaRecommendation) || null} 
            cardid="Đề xuất"
          />
        </div> */}
      </div>
    {/* === KHỐI 2: THÔNG TIN CHI TIẾT VÀ LIÊN QUAN === */}
      <div className="w-full flex flex-col lg:flex-row lg:max-w-[98%] mx-auto xl:max-w-[94%] lg:gap-[6px] mt-[3px]">
        <div className="flex-grow w-full h-full">
          <PlayerAnimeInfo data={data} />
        </div>
        <div className="h-full lg:flex lg:flex-col md:max-lg:w-full gap-10">
          <div className="rounded-lg hidden lg:block lg:max-w-[280px] xl:max-w-[380px] w-full xl:overflow-y-scroll xl:overflow-x-hidden overflow-hidden scrollbar-hide">
            <PlayerAnimeCard data={data?.relations?.edges} id="Liên quan" />
          </div>
        </div>
        {/* PHẦN ĐỀ XUẤT CHO MOBILE */}
        <div className="lg:hidden">
          <Animecards 
            data={data?.recommendations?.nodes?.map(item => item.mediaRecommendation) || null} 
            cardid="Đề xuất"
          />
        </div>
      </div>
    </>
  );
}

export default AnimeWatch;
