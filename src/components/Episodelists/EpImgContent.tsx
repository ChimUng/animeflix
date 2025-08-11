"use client";
import React, { useRef } from "react";
import Image from "next/image";
import styles from "../../styles/Epimglist.module.css";
import Link from "next/link";
import { AnimeItem, EpisodeInfo } from "@/lib/types";

// Kiểu dữ liệu cho từng episode
// export interface Episode {
//     id?: string;
//     episodeId?: string;
//     number: number | undefined
//     title?: string;
//     description?: string;
//     img?: string;
//     image?: string;
//     isFiller?: boolean;
// }

// Kiểu dữ liệu cho `data` (anime)
// export interface AnimeItem {
//     id: string | number;
//     bannerImage?: string;
//     coverImage?: {
//         extraLarge?: string;
//     };
//     type?: string;
//     status?: string;
//     nextAiringEpisode?: {
//         episode: number;
//     };
// }

interface EpImgContentProps {
    data: AnimeItem;
    epdata: EpisodeInfo[];
    defaultProvider: string;
    subtype: string;
    epnum: number;
    progress: number;
}

const EpImgContent: React.FC<EpImgContentProps> = ({data,epdata,defaultProvider,subtype,epnum,progress,}) => {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    return (
        <div className={styles.epimgcondiv} ref={scrollContainerRef}>
        {epdata
            .filter((episode) => episode.number !== undefined)
            .map((episode) => {
            const isWatched = progress >= episode.number!;
            const isCurrentEp = parseInt(String(epnum)) === episode.number!;

            return (
            <Link
                href={`/anime/watch?id=${data?.id}&host=${defaultProvider}&epid=${encodeURIComponent(
                episode?.id || episode?.episodeId || ""
                )}&ep=${episode?.number}&type=${subtype}`}
                key={episode?.id || episode?.episodeId}
                className={`flex flex-row items-center transition-all duration-300 ease-out hover:scale-[0.985] hover:bg-[#27272c] rounded-lg my-[5px] bg-[#18181b] ${
                isCurrentEp
                    ? "scale-[0.99] ring-1 opacity-60 hover:bg-[#18181b] pointer-events-none hover:shadow-lg ring-white"
                    : ""
                } ${isWatched ? "opacity-80" : ""}`}
            >
                <div className={styles.epcondiv}>
                <Image
                    src={
                    episode?.img ||
                    episode?.image ||
                    data?.bannerImage ||
                    data?.coverImage?.extraLarge ||
                    "/placeholder.jpg"
                    }
                    alt={episode?.title || "Episode image"}
                    width={200}
                    height={200}
                    className={styles.epimgcon}
                    quality={100}
                />
                {isCurrentEp && (
                    <div className={styles.epimgplayico}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`play-buttonicon w-7 h-7 ${styles.play}`}
                        viewBox="0 0 24 24"
                    >
                        <path
                        fill="currentColor"
                        d="M21.409 9.353a2.998 2.998 0 0 1 0 5.294L8.597 21.614C6.534 22.737 4 21.277 4 18.968V5.033c0-2.31 2.534-3.769 4.597-2.648z"
                        />
                    </svg>
                    </div>
                )}
                <span className={styles.epimgnumber}>{"Tập " + episode?.number}</span>
                <span
                    className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-xl bg-red-600 z-10`}
                    style={{
                    width: isWatched ? "92%" : "0",
                    }}
                />
                </div>
                <div className={styles.epimgright}>
                <div className={styles.epimgtitle}>
                    {episode?.number}. {episode?.title || `Tập ${episode?.number}`}
                </div>
                <div className={styles.epimgdescription}>{episode?.description}</div>
                {episode?.isFiller && (
                    <span className="p-1 px-2 text-xs mt-1 rounded-xl bg-[#d14836] font-semibold w-min inline-block whitespace-nowrap">
                    Ngoại truyện
                    </span>
                )}
                </div>
            </Link>
            );
        })}
        </div>
    );
};

export default EpImgContent;
