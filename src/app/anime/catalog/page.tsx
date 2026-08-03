import React from 'react';
import Catalog from '@/components/catalogcomponent/Catalog';
import Navbarcomponent from '@/components/navbar/Navbar';
import { Metadata } from 'next';

interface PageProps {
  searchParams: Promise<{
    year?: string;
    season?: string;
    format?: string;
    genre?: string[] | string;
    search?: string;
    sortby?: string;
    airing?: string;
  }>;
}

const seasonLabel: Record<string, string> = {
  WINTER: 'Mùa Đông',
  SPRING: 'Mùa Xuân',
  SUMMER: 'Mùa Hè',
  FALL: 'Mùa Thu',
};
 
const formatLabel: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'TV Ngắn',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
};
 
const airingLabel: Record<string, string> = {
  RELEASING: 'Đang phát sóng',
  NOT_YET_RELEASED: 'Sắp phát sóng',
  FINISHED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { year, season, format, genre, search, sortby, airing } = await searchParams;
  const genreList = Array.isArray(genre) ? genre : genre ? [genre] : [];
 
  const parts: string[] = [];
  if (genreList.length) parts.push(genreList.join(', '));
  if (season) parts.push(seasonLabel[season] ?? season);
  if (year) parts.push(year);
  if (format) parts.push(formatLabel[format] ?? format);
  if (airing) parts.push(airingLabel[airing] ?? airing);
 
  const title = search
    ? `Tìm kiếm "${search}" - Animeflix`
    : parts.length
    ? `${parts.join(' - ')} | Danh mục Anime - Animeflix`
    : 'Danh mục Anime - Tìm kiếm & Lọc Anime Vietsub | Animeflix';
 
  const description = search
    ? `Kết quả tìm kiếm anime cho từ khóa "${search}" tại Animeflix. Xem anime vietsub online chất lượng cao.`
    : parts.length
    ? `Xem anime ${parts.join(', ')} vietsub online tại Animeflix. Cập nhật liên tục, chất lượng HD.`
    : 'Tìm kiếm, lọc anime theo thể loại, năm, mùa, định dạng và trạng thái phát sóng tại Animeflix.';
 
  const qp = new URLSearchParams();
  if (year) qp.set('year', year);
  if (season) qp.set('season', season);
  if (format) qp.set('format', format);
  if (sortby) qp.set('sortby', sortby);
  if (airing) qp.set('airing', airing);
  genreList.forEach((g) => qp.append('genre', g));
  const canonical = `/anime/catalog${qp.toString() ? `?${qp.toString()}` : ''}`;
 
  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Animeflix',
      url: canonical,
      locale: 'vi_VN',
      alternateLocale: ['en_US'],
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    
    robots: search
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

const Page = async ({ searchParams }: PageProps) => {
  const {
    year,
    season,
    format,
    genre,
    search,
    sortby,
    airing,
  } = await searchParams;
 
    return (
        <div>
        <Navbarcomponent />
        <div className="max-w-[94%] xl:max-w-[88%] mx-auto mt-[70px]">
            <Catalog
            searchParams={{
                year,
                season,
                format,
                genre: Array.isArray(genre) ? genre : genre ? [genre] : [],
                search,
                sortby,
                airing,
            }}
            />
        </div>
        </div>
    );
};
 
export default Page;
