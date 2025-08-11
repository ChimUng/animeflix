import React from 'react';
import Catalog from '@/components/catalogcomponent/Catalog';
import Navbarcomponent from '@/components/navbar/Navbar';
import { Metadata } from 'next';

// Kiểu dữ liệu cho props của page
interface PageProps {
    searchParams: {
        year?: string;
        season?: string;
        format?: string;
        genre?: string[] | string;
        search?: string;
        sortby?: string;
    };
}

// Metadata cho SEO
export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Animeflix - Danh mục Anime',
        openGraph: {
        title: 'Animeflix - Danh mục Anime',
        },
        twitter: {
        card: 'summary',
        title: 'Animeflix - Danh mục Anime',
        },
    };
}

// Component chính
const Page: React.FC<PageProps> = ({ searchParams }) => {
    const {
        year,
        season,
        format,
        genre,
        search,
        sortby
    } = searchParams;

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
            }}
            />
        </div>
        </div>
    );
};

export default Page;
