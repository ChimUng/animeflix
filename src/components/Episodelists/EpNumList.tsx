import React from "react";
import Link from "next/link";
import styles from "../../styles/Epimglist.module.css";
import { AnimeItem, EpisodeInfo } from "@/lib/types";

interface EpNumListProps {
    data: AnimeItem;
    epdata: EpisodeInfo[];
    defaultProvider: string;
    subtype: string;
    epnum: string | number;
}

const EpNumList: React.FC<EpNumListProps> = ({data,epdata,defaultProvider,subtype,epnum,}) => {
    return (
        <div className={styles.epnumlistcontainer}>
        {epdata.slice().map((episode) => {
            const isCurrent = parseInt(String(epnum)) === episode.number;
            const isFiller = episode.isFiller === true;

            return (
            <Link
                href={`/anime/watch?id=${data?.id}&host=${defaultProvider}&epid=${encodeURIComponent(
                episode?.id || episode?.episodeId || ""
                )}&ep=${episode?.number}&type=${subtype}`}
                key={episode?.id || episode?.episodeId}
            >
                <div
                className={`${isFiller ? "bg-[#d14836]/20" : "bg-[#67686f]/40"} ${
                    styles.epdiv
                } ${isCurrent ? styles.selectedEpnum : ""}`}
                >
                {episode.number}
                </div>
            </Link>
            );
        })}
        </div>
    );
};

export default EpNumList;
