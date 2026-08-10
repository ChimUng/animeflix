import { Metadata } from "next";
import { AnimeInfoAnilist, PopularThisSeason } from "@/lib/Anilistfunctions";
import { getRecentEpisodes } from "@/lib/getData";
import NextAiringDate from "@/components/videoplayer/NextAiringDate";
import PlayerAnimeCard from "@/components/videoplayer/PlayerAnimeCard";
import PlayerAnimeInfo from "@/components/videoplayer/PlayerAnimeInfo";
import PlayerVerticalList from "@/components/videoplayer/PlayerVerticalList";
import Navbarcomponent from "@/components/navbar/Navbar";
import PlayerComponent from "@/components/videoplayer/PlayerComponent";
import Animecards from "@/components/CardComponent/Animecards";
import { createWatchEp, getEpisode, updateEp } from "@/lib/EpHistoryfunctions";
import { redis } from "@/lib/rediscache";
import { getAuthSession } from "../../../api/auth/[...nextauth]/route";
import type { WatchData } from "@/types/watch";
import type { Session } from "next-auth";
import type { AnimeItem } from "@/types/anime";
import type { SavedEpisode, WatchRouteParams } from "@/types/stream";

import CoralComments from "@/components/CommentComponent/CoralComments";

export interface PageProps {
  params: Promise<{ watchid: string[] }>;
}

function parseWatchParams(watchid: string[] = []): WatchRouteParams {
  const [id, provider = "anineko", epidRaw = "", epnum = "1", type = "sub"] = watchid;
  return {
    id: id || "",
    provider,
    epId: epidRaw ? decodeURIComponent(epidRaw) : "",
    epNum: epnum,
    subdub: type,
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { watchid } = await params;
  const { id, epNum } = parseWatchParams(watchid);
  const data = await getInfo(id);

  const title = `Tập ${epNum} - ${data?.title?.english || data?.title?.romaji || "Anime"}`;
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

async function Ephistory(
  session: Session | null,
  aniId: string,
  epNum: number,
  data: AnimeItem,
  epId: string
): Promise<WatchData[] | null> {
  try {
    if (session && aniId && epNum) {
      await createWatchEp(aniId, epNum);
      await updateEp({
        aniId,
        epNum,
        epId,
        aniTitle: data?.title?.english || data?.title?.romaji || data?.title?.native || "Unknown",
        image: data?.bannerImage || data?.coverImage?.extraLarge || data?.coverImage?.large || "",
        subtype: "sub",
      });
      return (await getEpisode(aniId, epNum)) ?? null;
    }
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function AnimeWatch({ params }: PageProps) {
  const { watchid } = await params;
  const { id, provider, epId, epNum, subdub } = parseWatchParams(watchid);
  const session = await getAuthSession();
  const appUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || "http://localhost:3000";


  if (!id || !epId) {
    return <div>Error: Missing required parameters.</div>;
  }

  const [data, recentData, popularData] = await Promise.all([
    getInfo(id),
    getRecentEpisodes().catch(() => []),
    PopularThisSeason().catch(() => []),
  ]);
  const savedepRaw = data ? await Ephistory(session, id, parseInt(epNum), data, epId) : null;

  const savedep: SavedEpisode[] = Array.isArray(savedepRaw)
    ? savedepRaw
        .filter((item) => item.timeWatched != null)
        .map((item) => ({ timeWatched: item.timeWatched! }))
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
          <div className="hidden lg:block lg:max-w-[280px] xl:max-w-[380px] w-full overflow-hidden">
            <PlayerVerticalList
              recentData={recentData ?? []}
              popularData={popularData ?? []}
              title="Khám phá"
              compact={true}
            />
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col lg:flex-row lg:max-w-[98%] mx-auto xl:max-w-[94%] lg:gap-[6px] mt-[40px]">
        <div className="flex-grow w-full h-full">
          <PlayerAnimeInfo data={data} />
          <div className="mt-8">
            <CoralComments
              storyId={`anime-watch-${id}-ep-${epNum}`}
              storyUrl={`${appUrl}/anime/watch/${id}/${epNum}`}
            />
          </div>
        </div>
        <div className="h-full lg:flex lg:flex-col md:max-lg:w-full gap-10">
          <div className="rounded-lg hidden lg:block lg:max-w-[280px] xl:max-w-[380px] w-full xl:overflow-y-scroll xl:overflow-x-hidden overflow-hidden scrollbar-hide">
            <PlayerAnimeCard data={data?.relations?.edges} id="Liên quan" />
          </div>
        </div>
        <div className="lg:hidden mt-4">
          <PlayerVerticalList
            recentData={recentData ?? []}
            popularData={popularData ?? []}
            title="Top Anime"
            compact={false}
          />
        </div>
        <div className="lg:hidden mt-4">
          <Animecards
            data={data?.recommendations?.nodes?.map((item) => item.mediaRecommendation) || []}
            cardid="Đề xuất"
          />
        </div>
      </div>
    </>
  );
}

export default AnimeWatch;
