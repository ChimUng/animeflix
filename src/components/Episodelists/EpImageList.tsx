"use client";
import React from 'react';
import Image from 'next/image';
// import styles from '../../styles/Epimglist.module.css';
import Link from 'next/link';
import { AnimeItem } from '@/types/anime';
import { Episode } from '@/types/episode';
import { EpPlayIcon } from '@/lib/SvgIcons';
import { buildWatchUrl } from '@/utils/watchUrl';
import { StarScoreIcon } from '@/lib/SvgIcons';

// Props của component
interface EpImageListProps {
    data: AnimeItem;
    epdata: Episode[];
    defaultProvider: string;
    subtype: string;
    progress: number;
}

const EpImageList: React.FC<EpImageListProps> = ({data,epdata,defaultProvider,subtype,progress,}) => {
        return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4 !max-h-[22.2rem] md:max-h-[26rem] lg:max-h-[29rem] xl:!max-h-[28.8rem] max-2xl:max-h-[40rem] overflow-y-auto">
        {epdata.length > 0 ? (
            epdata.map((episode) => {
            const isWatched = progress >= episode.number;

            return (
                <Link
                key={episode?.id || episode?.episodeId}
                href={buildWatchUrl({
                    id: data?.id ?? "",
                    provider: defaultProvider,
                    epId: episode?.id || episode?.episodeId || "",
                    epNum: episode?.number ?? "",
                    subdub: subtype,
                    })}
                className="relative group"
                >
                <div
                    className={`relative w-full flex-1 rounded-lg overflow-hidden bg-[#18181b] aspect-video ${
                    isWatched ? "opacity-60" : ""
                    }`}
                >
                    <Image
                    src={
                        episode?.img ||
                        episode?.image ||
                        data?.bannerImage ||
                        data?.coverImage?.extraLarge ||
                        "/placeholder.jpg"
                    }
                    width={200}
                    height={200}
                    alt={episode?.title || `Episode ${episode.number}`}
                    className="bg-[#18181b] h-full w-full object-cover aspect-w-16 aspect-h-9 rounded-lg transition-all duration-300 transform group-hover:scale-105 group-hover:opacity-60"
                    quality={100}
                    />
                    {episode?.rating && (
                    <span className="absolute top-2 left-2 z-[10] flex items-center gap-0.5 bg-black bg-opacity-60 px-[6px] py-[3px] text-xs rounded-md">
                        <StarScoreIcon className="w-3 h-3 fill-star text-star" />
                        {Number(episode.rating).toFixed(1)}
                    </span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                    <div className="hidden group-hover:flex items-center justify-center opacity-0 bg-white bg-opacity-40 hover:bg-[#d14836] rounded-full shadow group-hover:opacity-90 w-12 h-12">
                        <EpPlayIcon className="play-buttonicon w-5 h-5" />
                    </div>
                    </div>
                </div>
                <span className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-[6px] py-[3px] text-xs rounded-md">
                    {"Tập " + episode?.number}
                </span>
                {episode?.isFiller && (
                    <span className="absolute bottom-2 right-2 bg-[#d14836] px-[6px] py-[3px] text-xs rounded-md">
                    Ngoại truyện
                    </span>
                )}
                <span
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-xl bg-red-600 z-10"
                    style={{ width: isWatched ? "92%" : "0%" }}
                />
                </Link>
            );
            })
        ) : (
            <p className="text-center">Không có tập phim</p>
        )}
        </div>
    );
};

export default EpImageList;