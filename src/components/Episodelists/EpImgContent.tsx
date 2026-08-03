"use client";
import React, { useRef } from "react";
import Image from "next/image";
import styles from "../../styles/Epimglist.module.css";
import Link from "next/link";
import { AnimeItem } from "@/types/anime";
import { EpisodeInfo } from "@/types/episode";
import { EpPlayIcon } from '@/lib/SvgIcons';
import { buildWatchUrl } from "@/utils/watchUrl";
import { StarScoreIcon } from "@/lib/SvgIcons";

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
                href={buildWatchUrl({
                    id: data?.id ?? "",
                    provider: defaultProvider,
                    epId: episode?.id || episode?.episodeId || "",
                    epNum: episode?.number ?? "",
                    subdub: subtype,
                })}
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
                {episode?.rating && (
                    <div className="z-[10] absolute top-0 left-0 flex items-center justify-center gap-0.5 bg-black/60 backdrop-blur font-light text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-br-lg rounded-tl-lg tracking-wider">
                    <StarScoreIcon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-star text-star" />
                    <span className="font-semibold text-white">{Number(episode.rating).toFixed(1)}</span>
                    </div>
                )}
                {isCurrentEp && (
                    <div className={styles.epimgplayico}>
                        <EpPlayIcon className={`play-buttonicon w-7 h-7 ${styles.play}`} />
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