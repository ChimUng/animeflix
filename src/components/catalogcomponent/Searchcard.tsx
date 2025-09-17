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

interface SearchcardProps {
    searchvalue: string;
    selectedYear: number | null;
    seasonvalue: string | null;
    formatvalue: string | null;
    genrevalue: any[];
    sortbyvalue: string | null;
    airingvalue?: string | null;
    }

    const Searchcard: React.FC<SearchcardProps> = ({
    searchvalue,
    selectedYear,
    seasonvalue,
    formatvalue,
    genrevalue,
    sortbyvalue,
    airingvalue,
    }) => {
    const animetitle = useStore(useTitle, (state) => state.animetitle);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchdata, setsearchdata] = useState<any[] | null>(null);
    const [lastpage, setlastpage] = useState<number | undefined>();
    const [loading, setLoading] = useState(true);
    const debouncedSearch = UseDebounce(searchvalue, 500);

    useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedYear, seasonvalue, formatvalue, genrevalue, sortbyvalue, airingvalue]);

  // Gọi API tìm kiếm nâng cao mỗi khi thay đổi các filter hoặc trang
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
          currentPage
        );
        // console.log("📦 Response:", response); // debug kiểm tra pagination
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
          Không tìm thấy kết quả <span className="text-3xl text-d234">"{searchvalue}"</span>
        </div>
      )}

      <div className={styles.cardtop}>
        {loading &&
          Array.from({ length: 20 }, (_, index) => (
            <div key={index} className={`${styles.carditem} ${styles.loading}`}>
              <div
                className={`${styles.cardimgcontainer} ${styles.pulse}`}
                style={{ animationDelay: `${(index + 2) * 0.1}s` }}
              ></div>
            </div>
          ))}

        {!loading &&
          searchdata?.map((item) => {
            const episodeNumber =
              item.episodes ??
              (item?.nextAiringEpisode?.episode !== undefined
                ? item.nextAiringEpisode.episode - 1
                : "?");

            return (
              <Link href={`/anime/info/${item.id}`} key={item.id}>
                <div key={item.id} className={styles.carditem}>
                  <div className={styles.cardimgcontainer}>
                    <Image
                      src={item.coverImage?.extraLarge ?? item.image ?? ""}
                      alt={item.title?.english ?? item.title?.romaji ?? "Anime Title"}
                      // width={155}
                      // height={230}
                      // style={{ height: "auto" }}
                      placeholder="blur"
                      fill
                      blurDataURL={item.coverImage?.extraLarge ?? item.image ?? ""}
                      className={styles.cardimage}
                    />
                  </div>
                  <div className="hidden xl:flex h-[85%] w-[100%] rounded absolute hover:bg-gradient-to-t from-black/90 to-transparent z-7 opacity-0 hover:opacity-100 transition-all duration-300 ease justify-center">
                    {/* SVG icon ở giữa */}
                    <div className="flex items-center justify-center z-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-white/80 hover:text-[#d14836] transition duration-300 ease-in-out transform hover:scale-110" viewBox="0 0 48 48">
                        <defs>
                          <mask id="ipSPlay0">
                            <g fill="none" strokeLinejoin="round" strokeWidth="4">
                              <path fill="#fff" stroke="#fff" d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4S4 12.954 4 24s8.954 20 20 20Z"/>
                              <path fill="#000" stroke="#000" d="M20 24v-6.928l6 3.464L32 24l-6 3.464l-6 3.464z"/>
                            </g>
                          </mask>
                        </defs>
                        <path fill="currentColor" d="M0 0h48v48H0z" mask="url(#ipSPlay0)"/>
                      </svg>
                    </div>
                    {/* Thông tin bên dưới */}
                    <div className="absolute bottom-4 text-xs font-light flex flex-wrap items-center justify-center gap-[.3rem] z-10">
                      <span className="uppercase">{item.format || "?"}</span>
                      <span className="text-[10px]">&#8226;</span>
                      <span
                        className={
                          item.status === "RELEASING"
                            ? "text-green-400 font-normal"
                            : item.status === "NOT_YET_RELEASED"
                            ? "text-red-600 font-normal"
                            : "text-white font-normal"
                        }
                      >
                        {item.status}
                      </span>
                      <span className="text-[10px]">&#8226;</span>
                      <span>Tập {episodeNumber}</span>
                    </div>
                  </div>
                  <span className={styles.cardtitle}>
                    <span
                      className={`aspect-square w-2 h-2 inline-block mr-1 rounded-full ${
                        item.status === "NOT_YET_RELEASED"
                          ? "bg-red-500"
                          : item.status === "RELEASING"
                          ? "bg-green-500"
                          : "hidden"
                      } xl:hidden`}
                    ></span>
                    {item.title?.[animetitle] || item.title?.romaji}
                  </span>
                </div>
              </Link>
            );
          })}
      </div>

      {lastpage && lastpage > 1 && (
        <div className={styles.cardbottom}>
          <Pagination
            total={lastpage}
            color="danger"
            page={currentPage}
            onChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default Searchcard;
