"use client";
import React, { useEffect, useRef, useState } from "react";
import styles from '../../styles/PlayerEpisodeList.module.css';
import { filterEpisodesBySubtype } from "@/utils/EpisodeFunctions";
import { useRouter } from 'next-nprogress-bar';
import EpImgContent from "../Episodelists/EpImgContent";
import EpNumList from "../Episodelists/EpNumList";
import { Select, SelectItem, Tooltip } from "@nextui-org/react";
import Skeleton from "react-loading-skeleton";
import { useSubtype } from '@/lib/store';
import { useStore } from 'zustand';
import type { Provider, EpisodeInfo } from "@/types/episode";
import type { AnimeItem,  } from "@/types/anime";
import { toast } from "sonner";
import {
  EpRefreshIcon,
  EpGridIcon,
  EpCompactListIcon,
  EpReverseIcon,
  EpisodeCountIcon,
} from "@/lib/SvgIcons";

interface PlayerEpisodeListProps {
  isLoading: boolean;
  id: string;
  data: AnimeItem;
  onprovider: string;
  epnum: number;
  allProvidersData: Provider[] | null;
  episodeMap: Record<number, Record<string, string>>;
  onProviderNavigate: (
    newProvider: string,
    newEpId: string,
    newEpNum: number | string,
    newSubdub: string
  ) => void;
}

// Map tên thật của provider thành tên hiển thị trên UI
const PROVIDER_UI_NAMES: Record<string, string> = {
  anineko: "Eng",
  animehay: "Việt",
};

function PlayerEpisodeList({ isLoading, id, data, onprovider, epnum, allProvidersData, episodeMap, onProviderNavigate }: PlayerEpisodeListProps) {
  const subtype = useStore(useSubtype, (state: { subtype: string }) => state.subtype);
  const router = useRouter();

  const prevAllProvidersData = useRef<Provider[] | null>(null);

  const [epListType, setEpListType] = useState<number>(2);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentEpisodes, setCurrentEpisodes] = useState<EpisodeInfo[] | null>(null);
  const [filteredEp, setFilteredEp] = useState<EpisodeInfo[]>([]);
  const itemsPerPage: number = 35;
  const [progress] = useState<number>(0);
  const [refreshLoading, setRefreshLoading] = useState<boolean>(false);

  useEffect(() => {
    if (allProvidersData) {
      if (refreshLoading && prevAllProvidersData.current !== allProvidersData) {
        toast.success("Danh sách tập phim đã được cập nhật!");
        setRefreshLoading(false);
      }

      const providerData = allProvidersData.find(p => p.providerId === onprovider) ?? null;
      const episodes = filterEpisodesBySubtype(providerData, subtype) as EpisodeInfo[];

      setCurrentEpisodes(episodes);
      prevAllProvidersData.current = allProvidersData;
    }
  }, [allProvidersData, onprovider, subtype]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const slicedEp = currentEpisodes?.slice(startIndex, endIndex) || [];
    setFilteredEp(slicedEp);
  }, [currentEpisodes, currentPage]);

  useEffect(() => {
    if (epnum) {
      const calculatedPage = Math.ceil(epnum / itemsPerPage);
      setCurrentPage(calculatedPage <= 0 ? 1 : calculatedPage);
    }
  }, [epnum]);

  useEffect(() => {
    const listType = localStorage.getItem('eplisttype');
    if (listType) {
      setEpListType(parseInt(listType, 10));
    }
  }, []);

  const handleOptionClick = (option: number) => {
    setEpListType(option);
    localStorage.setItem('eplisttype', option.toString());
  };

  const reverseToggle = () => {
    setCurrentPage(1);
    setCurrentEpisodes(prev => (prev ? [...prev].reverse() : null));
  };

  const handleProviderChange = (newProvider: string) => {
    const idsForCurrentEpisode = episodeMap[epnum];

    if (idsForCurrentEpisode && idsForCurrentEpisode[newProvider]) {
      onProviderNavigate(newProvider, idsForCurrentEpisode[newProvider], epnum, subtype);
      return;
    }

    const providerData = allProvidersData?.find(p => p.providerId === newProvider);
    if (!providerData) {
      toast.error("Không tìm thấy server được chọn.");
      return;
    }

    let firstEpisode: EpisodeInfo | undefined;
    if (Array.isArray(providerData.episodes)) {
      firstEpisode = providerData.episodes[0];
    } else {
      firstEpisode = subtype === 'sub' ? providerData.episodes.sub?.[0] : providerData.episodes.dub?.[0];
    }

    if (!firstEpisode) {
      toast.error("Không có tập phim nào ở server này.");
      return;
    }

    toast.info(`Không tìm thấy tập ${epnum}, chuyển về tập đầu tiên.`);
    onProviderNavigate(newProvider, firstEpisode.id || firstEpisode.episodeId || "", firstEpisode.number ?? "", subtype);
  };

  const refreshEpisodes = () => {
    if (refreshLoading) return;
    setRefreshLoading(true);
    toast.info("Đang cập nhật danh sách tập phim...");
    router.refresh();
  };

  return (
    <div className={styles.episodelist}>
      {isLoading ? (
        <>
          {[1].map((item) => (
            <Skeleton
              key={item}
              className="bg-[#18181b] flex w-full h-[100px] rounded-lg scale-100 transition-all duration-300 ease-out"
            />
          ))}
        </>
      ) : (
        <div className={styles.episodetop}>
          <div className={styles.episodetopleft}>
            <span className="text-xs lg:text-xs">Bạn đang xem</span>
            <span className="font-bold text-sm md:text-white">Tập {epnum}</span>
            <span className="!leading-tight !text-[0.8rem] flex flex-col items-center justify-center text-center">
              Nếu server hiện tại không hoạt động, vui lòng thử các server khác.
            </span>
          </div>
          <div className={styles.episodetopright}>
            <div className={styles.episodesub}>
              <span className={styles.episodetypes}>
                Provider:
              </span>
              {allProvidersData?.map((item) => (
                <div
                  key={item.providerId}
                  className={item.providerId === onprovider ? styles.providerselected : styles.provider}
                  onClick={() => handleProviderChange(item.providerId)}
                >
                  {/* Sử dụng map để hiển thị "Eng" / "Việt", fallback về tên cũ nếu không nằm trong map */}
                  {PROVIDER_UI_NAMES[item.providerId] || item.providerId}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className={styles.episodebottom}>
        {isLoading ? (
          <Skeleton className="bg-[#18181b] w-full h-[200px] rounded-lg" />
        ) : currentEpisodes && currentEpisodes.length > 0 ? (
          <>
            <div className={styles.episodetitle}>
              <div className={styles.epleft}>
                <h3 className={styles.epheading}>Danh sách tập</h3>
                <Tooltip content="Refresh Episodes">
                  <button className={styles.refresh} onClick={refreshEpisodes}>
                    <EpRefreshIcon className={`w-[22px] h-[22px] ${refreshLoading ? "animate-spin" : ""}`} />
                  </button>
                </Tooltip>
              </div>
              <div className={styles.epright}>
                {currentEpisodes && currentEpisodes.length > itemsPerPage && (
                  <Select
                    label=""
                    aria-label="Episode Range"
                    placeholder="Episodes"
                    labelPlacement="outside"
                    selectedKeys={[currentPage.toString()]}
                    disallowEmptySelection={true}
                    classNames={{
                      base: "!m-0 !p-0 ",
                      mainWrapper: "p-0 m-0 h-[34px]",
                      trigger: "m-0 !min-h-[30px] w-[120px] pr-0",
                      value: "",
                      listbox: "m-0 p-0",
                    }}
                    radius="sm"
                    onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                  >
                    {Array.from({ length: Math.ceil(currentEpisodes.length / itemsPerPage) }, (_, i) => i + 1).map((page) => {
                      const startIdx = (page - 1) * itemsPerPage + 1;
                      const endIdx = Math.min(page * itemsPerPage, currentEpisodes.length);

                      return (
                        <SelectItem key={page} value={page}>
                          {`${startIdx}-${endIdx}`}
                        </SelectItem>
                      );
                    })}
                  </Select>
                )}
                <span
                  className={`cursor-pointer ${epListType === 2 ? 'selected' : ''}`}
                  onClick={() => handleOptionClick(2)}
                >
                  <EpGridIcon
                    className="w-6 h-6"
                    stroke={epListType === 2 ? '#ca1313' : 'currentColor'}
                  />
                </span>
                <span
                  className={`cursor-pointer ${epListType === 3 ? 'selected' : ''}`}
                  onClick={() => handleOptionClick(3)}
                >
                  <EpCompactListIcon
                    className="w-6 h-6"
                    stroke={epListType === 3 ? '#ca1313' : 'currentColor'}
                  />
                </span>
                <span onClick={reverseToggle} className="cursor-pointer">
                  <EpReverseIcon className="w-6 h-6" />
                </span>
              </div>
            </div>
            {epListType === 2 && (
              <div className="mt-3">
                <EpImgContent
                  data={data}
                  epdata={filteredEp}
                  defaultProvider={onprovider}
                  subtype={subtype}
                  epnum={epnum}
                  progress={progress}
                />
              </div>
            )}
            {epListType === 3 && (
              <div className={styles.epnumlist}>
                <EpNumList
                  data={data}
                  epdata={filteredEp}
                  defaultProvider={onprovider}
                  subtype={subtype}
                  epnum={epnum}
                />
              </div>
            )}
          </>
        ) : (
          <div className='text-center bg-[#18181b] py-2 rounded-lg'>
            <p className="text-center mt-2">Oh no!</p>
            <p className="text-center mb-2">
              This anime is currently unavailable. Check back later for updates!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerEpisodeList;