"use client";

import Link from "next/link";
import Image from "next/image";
import { AdvancedSearch } from "@/lib/Anilistfunctions";
import React, { useEffect, useState } from "react";
import { Pagination } from "@nextui-org/react";
import styles from "../../styles/Catalog.module.css";
import UseDebounce from "@/utils/UseDebounce";
import { useTitle } from "@/lib/store";
import { useStore } from "zustand";
import { AnimeItem, AnimeTitle } from "@/types/anime"; 
import { PlayIcon, StarScoreIcon } from "@/lib/SvgIcons"; 

type Option = { name: string; value: string; type: string };

interface SearchcardProps {
    searchvalue: string;
    selectedYear: number | null;
    seasonvalue: string | null;
    formatvalue: string | null;
    genrevalue: Option[];
    sortbyvalue: string | null;
    airingvalue?: string | null;
}

const formatViews = (num?: number | null) => {
    if (!num) return null;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M lượt xem`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K lượt xem`;
    return `${num} lượt xem`;
};

const Searchcard: React.FC<SearchcardProps> = ({
    searchvalue, selectedYear, seasonvalue, formatvalue, genrevalue, sortbyvalue, airingvalue,
}) => {
    const animetitle = useStore(useTitle, (state) => state.animetitle) as keyof AnimeTitle;
    const [currentPage, setCurrentPage] = useState(1);
    const [searchdata, setsearchdata] = useState<AnimeItem[] | null>(null);
    const [lastpage, setlastpage] = useState<number | undefined>();
    const [loading, setLoading] = useState(true);
    const debouncedSearch = UseDebounce(searchvalue, 500);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, selectedYear, seasonvalue, formatvalue, genrevalue, sortbyvalue, airingvalue]);

    useEffect(() => {
        const fetchsearch = async () => {
            setLoading(true);
            try {
                const response = await AdvancedSearch(
                    debouncedSearch,
                    selectedYear,
                    seasonvalue,
                    formatvalue,
                    genrevalue,
                    sortbyvalue,
                    currentPage,
                    airingvalue ?? null
                );
                setsearchdata(response.media);
                setlastpage(response.pageInfo.lastPage);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching search results:", error);
                setLoading(false);
            }
        };
        fetchsearch();
    }, [debouncedSearch, selectedYear, seasonvalue, formatvalue, genrevalue, sortbyvalue, currentPage, airingvalue]);

    return (
        <div className={styles.searchcard}>
            {!loading && searchdata && searchdata.length === 0 && (
                <div className="text-center w-[100%] h-[100%] text-semibold text-2xl">
                    <p>whoops!</p>
                    <p>Không tìm thấy kết quả <span className="text-3xl text-d234">&quot;{searchvalue}&quot;</span></p>
                </div>
            )}

            <div className={styles.cardtop}>
                {loading &&
                    Array.from({ length: 20 }, (_, index) => (
                        <div key={index} className={`${styles.carditem} ${styles.loading}`}>
                            <div className={`${styles.cardimgcontainer} ${styles.pulse}`} style={{ animationDelay: `${(index + 2) * 0.1}s` }} />
                        </div>
                    ))}

                {!loading &&
                    searchdata?.map((item) => {
                        const episodeNumber =
                            item.episodes ??
                            (item?.nextAiringEpisode?.episode !== undefined ? item.nextAiringEpisode.episode - 1 : "?");
                        const viewsLabel = formatViews(item.popularity); 

                        return (
                            <Link href={`/anime/info/${item.id}`} key={item.id}>
                                <div className={styles.carditem}>
                                    {item?.averageScore != null && item.status !== "NOT_YET_RELEASED" && (
                                        <div className="z-[5] absolute top-0 left-0 flex items-center gap-0.5 sm:gap-1 bg-black/60 backdrop-blur font-light text-white text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-br-lg tracking-wider">
                                            <StarScoreIcon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-star text-star" />
                                            <span className="font-semibold text-white">{(item.averageScore / 10).toFixed(1)}</span>
                                        </div>
                                    )}

                                    <div className={styles.cardimgcontainer}>
                                        <Image
                                            src={item.coverImage?.extraLarge ?? item.coverImage?.large ?? '/default.png'}
                                            alt={item.title?.english ?? item.title?.romaji ?? "Anime Title"}
                                            placeholder="blur"
                                            fill
                                            blurDataURL={item.coverImage?.extraLarge ?? item.coverImage?.large ?? '/default.png'}
                                            className={styles.cardimage}
                                        />
                                    </div>

                                    <div className="hidden xl:flex h-[85%] w-[100%] rounded absolute hover:bg-gradient-to-t from-black/90 to-transparent z-7 opacity-0 hover:opacity-100 transition-all duration-300 ease justify-center">
                                        <div className="flex items-center justify-center z-10">
                                            <PlayIcon className="w-14 h-14 text-white/80 hover:text-[#d14836] transition duration-300 ease-in-out transform hover:scale-110" />
                                        </div>
                                        <div className="absolute bottom-4 text-xs font-light flex flex-wrap items-center justify-center gap-[.3rem] z-10">
                                            <span className="uppercase">{item.format || "?"}</span>
                                            <span className="text-[10px]">&#8226;</span>
                                            <span className={
                                                item.status === "RELEASING" ? "text-green-400 font-normal" :
                                                item.status === "NOT_YET_RELEASED" ? "text-red-600 font-normal" :
                                                "text-white font-normal"
                                            }>
                                                {item.status}
                                            </span>
                                            <span className="text-[10px]">&#8226;</span>
                                            <span>Tập {episodeNumber}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center w-full">
                                        <span className={styles.cardtitle}>
                                            <span className={`aspect-square w-2 h-2 inline-block mr-1 rounded-full ${
                                                item.status === "NOT_YET_RELEASED" ? "bg-red-500" :
                                                item.status === "RELEASING" ? "bg-green-500" : "hidden"
                                            } xl:hidden`} />
                                            {item.title?.[animetitle] || item.title?.romaji}
                                        </span>
                                        {viewsLabel && (
                                            <span className="text-[11px] text-d656 mt-0.5 line-clamp-1">
                                                {viewsLabel}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
            </div>

            {lastpage && lastpage > 1 && (
                <div className={styles.cardbottom}>
                    <Pagination
                        total={lastpage}
                        page={currentPage}
                        onChange={setCurrentPage}
                        classNames={{
                            cursor: "bg-d234 text-white",
                            item: "text-white data-[hover=true]:bg-d234/20",
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default Searchcard;