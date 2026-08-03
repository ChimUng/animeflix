import React from 'react'
import Navbarcomponent from '@/components/navbar/Navbar'
import Animecard from '@/components/CardComponent/Animecards'
import Herosection from '@/components/home/Herosection'
import { TrendingAnilist, PopularAnilist, Top100Anilist, PopularThisSeason, PopularMovie, MostFavoriteAnilist, PopularNextSeason } from '@/lib/Anilistfunctions'
import { MotionDiv } from '@/utils/MotionDiv'
import VerticalList from '@/components/home/VerticalList'
import RecentEpisodes from '@/components/home/RecentEpisodes'
import GenreSlider from '@/components/CardComponent/Genrecards';
import ContinueWatching from '@/components//home/ContinueWatching'
import { getAuthSession } from './api/auth/[...nextauth]/route'
import type { Session } from 'next-auth'
import { AnimeItem } from '@/types/anime';
import { redis } from '@/lib/rediscache'

interface HomePageData {
  herodata: AnimeItem[];
  top100data: AnimeItem[];
  populardata: AnimeItem[];
  popularthisseasondata?: AnimeItem[]; 
  popularmovie?: AnimeItem[]; 
  mostfavorite?: AnimeItem[]; 
  nextseasondata?: AnimeItem[]; 
}
async function getHomePage(): Promise<HomePageData | null> {
  try {
    let cachedData: string | null;
    if (redis) {
      cachedData = await redis.get(`homepage`);
      if (!cachedData || !JSON.parse(cachedData)) { 
        if (cachedData) { 
            await redis.del(`homepage`);
        }
        cachedData = null;
      }
    } else {
      cachedData = null;
    }

    if (cachedData) {
      const { herodata, populardata, top100data, popularthisseasondata, popularmovie, mostfavorite, nextseasondata }: HomePageData = JSON.parse(cachedData);
      return { herodata, populardata, top100data, popularthisseasondata, popularmovie, mostfavorite, nextseasondata };
    } else {
      const [herodata, populardata, top100data, popularthisseasondata, popularmovie, mostfavorite, nextseasondata] = await Promise.all([
        TrendingAnilist(),
        PopularAnilist(),
        Top100Anilist(),
        PopularThisSeason(),
        PopularMovie(),
        MostFavoriteAnilist(),
        PopularNextSeason()
      ]);
      const cacheTime = 60 * 60 * 5; 
      if (redis) {
        await redis.set(`homepage`, JSON.stringify({ herodata, populardata, top100data, popularthisseasondata, popularmovie, mostfavorite, nextseasondata }), "EX", cacheTime);
      }
      return { herodata, populardata, top100data, popularthisseasondata, popularmovie, mostfavorite, nextseasondata };
    }
  } catch (error) {
    console.error("Error fetching homepage from anilist: ", error);
    return null;
  }
}

async function Home() {
  const session: Session | null = await getAuthSession();

  const { herodata = [], populardata = [], top100data = [], popularthisseasondata = [], popularmovie = [], mostfavorite = [], nextseasondata = [] }: HomePageData = (await getHomePage()) || { herodata: [], top100data: [], populardata: [], popularthisseasondata: [], popularmovie: [], mostfavorite: [], nextseasondata: [] };

  return (
    <div>
      <Navbarcomponent home={true} />
      <Herosection data={herodata} />
      <div className='sm:max-w-[97%] md:max-w-[95%] lg:max-w-[90%] xl:max-w-[85%] mx-auto flex flex-col md:gap-11 sm:gap-7 gap-5 mt-8'>
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <ContinueWatching session={session} />
        </MotionDiv>
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <GenreSlider />
        </MotionDiv>
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <Animecard data={herodata} cardid="Xu hướng" viewMoreHref="/anime/catalog?sortby=TRENDING_DESC" />
        </MotionDiv>
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <RecentEpisodes cardid="Các tập gần đây" viewMoreHref="/anime/catalog?sortby=UPDATED_AT_DESC" />
        </MotionDiv>
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <Animecard data={populardata} cardid="Phổ biến qua các mùa" viewMoreHref="/anime/catalog?sortby=POPULARITY_DESC" />
        </MotionDiv>
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <Animecard data={popularthisseasondata} cardid="Phổ biến mùa này" />
        </MotionDiv>
        
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <Animecard data={popularmovie} cardid="Movies phổ biến" viewMoreHref="/anime/catalog?format=MOVIE"/>
        </MotionDiv>
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <div className='lg:flex lg:flex-row justify-between lg:gap-20'>
            <VerticalList data={top100data} mobiledata={popularthisseasondata} id="Top 10 Anime" />
            <VerticalList data={mostfavorite} id="Yêu thích" />
          </div>
        </MotionDiv>
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <Animecard data={nextseasondata} cardid="Mùa tiếp theo" />
        </MotionDiv>
      </div>
    </div>
  )
}

export default Home;