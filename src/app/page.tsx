"use server"
import Animecard from '@/components/CardComponent/Animecards'
import Herosection from '@/components/home/Herosection'
import Navbarcomponent from '@/components/navbar/Navbar'
import { TrendingAnilist, PopularAnilist, Top100Anilist, SeasonalAnilist, PopularThisSeason, PopularMovie, MostFavoriteAnilist, PopularNextSeason } from '@/lib/Anilistfunctions'
import React from 'react'
import { MotionDiv } from '@/utils/MotionDiv'
import VerticalList from '@/components/home/VerticalList'
import RecentEpisodes from '@/components/home/RecentEpisodes'
import GenreSlider from '@/components/CardComponent/Genrecards';
import { getAuthSession } from './api/auth/[...nextauth]/route'
import { redis } from '@/lib/rediscache'
import type { Session } from 'next-auth' // Import type Session từ next-auth

export interface AnimeTitle {
  romaji: string;
  english?: string;
  native?: string;
  // Thêm các loại tiêu đề khác nếu có
}

export interface Trailer {
  id: string;
  site: string;
  thumbnail: string;
}

export interface StartDate {
  year: number;
  month: number;
  day: number;
}

export interface NextAiringEpisode {
  episode: number;
  timeUntilAiring: number;
}

export interface AnimeItem {
  id: number;
  title: AnimeTitle;
  coverImage: {
    large: string;
    medium: string;
  };
  bannerImage: string | null; // Thuộc tính cần thêm
  description: string;       // Thuộc tính cần thêm
  trailer?: Trailer;         // Thêm nếu Herosection sử dụng trailer
  status: string;            // Thêm nếu Herosection sử dụng status
  format: string;            // Thêm nếu Herosection sử dụng format
  startDate?: StartDate;     // Thêm nếu Herosection sử dụng startDate
  nextAiringEpisode?: NextAiringEpisode; // Thêm nếu Herosection sử dụng nextAiringEpisode
  episodes?: number;         // Thêm nếu Herosection sử dụng episodes
  // ... thêm các thuộc tính khác của anime nếu cần mà Herosection sử dụng
}

// Định nghĩa kiểu dữ liệu cho dữ liệu trang chủ trả về
interface HomePageData {
  herodata: AnimeItem[];
  top100data: AnimeItem[];
  seasonaldata: AnimeItem[];
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
      if (!cachedData || !JSON.parse(cachedData)) { // Kiểm tra cả cachedData null/undefined và parsing thất bại
        if (cachedData) { // Chỉ xóa nếu cachedData tồn tại nhưng không parse được
            await redis.del(`homepage`);
        }
        cachedData = null;
      }
    } else {
      cachedData = null;
    }

    if (cachedData) {
      const { herodata, populardata, top100data, seasonaldata, popularthisseasondata, popularmovie, mostfavorite, nextseasondata }: HomePageData = JSON.parse(cachedData);
      return { herodata, populardata, top100data, seasonaldata, popularthisseasondata, popularmovie, mostfavorite, nextseasondata };
    } else {
      const [herodata, populardata, top100data, seasonaldata, popularthisseasondata, popularmovie, mostfavorite, nextseasondata] = await Promise.all([
        TrendingAnilist(),
        PopularAnilist(),
        Top100Anilist(),
        SeasonalAnilist(),
        PopularThisSeason(),
        PopularMovie(),
        MostFavoriteAnilist(),
        PopularNextSeason()
      ]);
      const cacheTime = 60 * 60 * 2; // Cache trong 2 giờ
      if (redis) {
        await redis.set(`homepage`, JSON.stringify({ herodata, populardata, top100data, seasonaldata, popularthisseasondata, popularmovie, mostfavorite, nextseasondata }), "EX", cacheTime);
      }
      return { herodata, populardata, top100data, seasonaldata, popularthisseasondata, popularmovie, mostfavorite, nextseasondata };
    }
  } catch (error) {
    console.error("Error fetching homepage from anilist: ", error);
    return null;
  }
}

// React.FC<EmptyProps> có thể được sử dụng nếu component không nhận props
// Hoặc đơn giản chỉ cần là một async function không có kiểu cho props nếu là Server Component
async function Home() {
  const session: Session | null = await getAuthSession(); // Định nghĩa kiểu cho session

  // Sử dụng giá trị mặc định là mảng rỗng và định nghĩa kiểu cho các biến
  const { herodata = [], populardata = [], top100data = [], seasonaldata = [], popularthisseasondata = [], popularmovie = [], mostfavorite = [], nextseasondata = [] }: HomePageData = (await getHomePage()) || { herodata: [], top100data: [], seasonaldata: [] , populardata: [], popularthisseasondata: [], popularmovie: [], mostfavorite: [], nextseasondata: [] };

  return (
    <div>
      <Navbarcomponent home={true} />
      <Herosection data={herodata} />
      <div className='sm:max-w-[97%] md:max-w-[95%] lg:max-w-[90%] xl:max-w-[85%] mx-auto flex flex-col md:gap-11 sm:gap-7 gap-5 mt-8'>
        {/* <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <ContinueWatching session={session} />
        </MotionDiv> */}
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
          <Animecard data={herodata} cardid="Xu hướng" />
        </MotionDiv>
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <RecentEpisodes cardid="Các tập gần đây" />
        </MotionDiv>
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <Animecard data={populardata} cardid="Phổ biến qua các mùa" />
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
          <Animecard data={popularmovie} cardid="Movies phổ biến" />
        </MotionDiv>
        <MotionDiv
          initial={{ y: 10, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <div className='lg:flex lg:flex-row justify-between lg:gap-20'>
            <VerticalList data={top100data} mobiledata={seasonaldata} id="Top 10 Anime" />
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