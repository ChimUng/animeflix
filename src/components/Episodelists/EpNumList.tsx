import React from "react";
import Link from "next/link";
import styles from "../../styles/Epimglist.module.css";
import { AnimeItem } from "@/types/anime";
import { EpisodeInfo } from "@/types/episode";
import { buildWatchUrl } from "@/utils/watchUrl";

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
                key={episode.id || episode.episodeId || episode.number}
                href={buildWatchUrl({
                    id: data?.id ?? "",
                    provider: defaultProvider,
                    epId: episode?.id || episode?.episodeId || "",
                    epNum: episode?.number ?? "",
                    subdub: subtype,
                    })}
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