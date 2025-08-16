"use client";
import React, { useEffect, useRef, useState } from "react";
import styles from '../../styles/PlayerEpisodeList.module.css';
import { getEpisodes } from "@/lib/getData";
import { ProvidersMap } from "@/utils/EpisodeFunctions";
import { useRouter } from 'next-nprogress-bar';
import EpImgContent from "../Episodelists/EpImgContent";
import EpNumList from "../Episodelists/EpNumList";
import { Select, SelectItem, Tooltip } from "@nextui-org/react";
import Skeleton from "react-loading-skeleton";
import { useSubtype } from '@/lib/store';
import { useStore } from 'zustand';
import { Provider } from "@/lib/getData";
import { AnimeItem, EpisodeInfo } from "@/lib/types";
import { toast } from "sonner";

interface PlayerEpisodeListProps {
  isLoading: boolean; // ✅ THÊM: Nhận trạng thái loading từ cha
  id: string;
  data: AnimeItem;
  onprovider: string;
  epnum: number;
  allProvidersData: Provider[] | null; 
}

function PlayerEpisodeList({ isLoading, id, data, onprovider, epnum, allProvidersData }: PlayerEpisodeListProps) {
  const subtype = useStore(useSubtype, (state: { subtype: string }) => state.subtype);
  const router = useRouter();

  // Dùng useRef để theo dõi giá trị trước đó của allProvidersData
  const prevAllProvidersData = useRef<Provider[] | null>(null);
  
  // ✅ Giữ lại các state quản lý UI nội bộ
  const [epListType, setEpListType] = useState<number>(2);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentEpisodes, setCurrentEpisodes] = useState<EpisodeInfo[] | null>(null);
  const [filteredEp, setFilteredEp] = useState<EpisodeInfo[]>([]);
  const itemsPerPage: number = 35;
  const [subOptions, setSubOptions] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [refreshLoading, setRefreshLoading] = useState<boolean>(false);

  // ✅ useEffect mới để xử lý dữ liệu từ props
  useEffect(() => {
    if (allProvidersData) {

      // ✅ Logic mới để hiển thị toast thành công
      // Nếu refreshLoading đang true VÀ dữ liệu mới đã về (khác dữ liệu cũ)
      if (refreshLoading && prevAllProvidersData.current !== allProvidersData) {
        toast.success("Danh sách tập phim đã được cập nhật!");
        setRefreshLoading(false); // Tắt icon xoay
      }

      const { suboptions } = ProvidersMap(allProvidersData);
      setSubOptions(suboptions);
      
      const providerData = allProvidersData.find(p => p.providerId === onprovider);
      let episodes: EpisodeInfo[] = [];
      if(providerData) {
          if (providerData.consumet) {
            const episodesObj = providerData.episodes as { sub?: EpisodeInfo[]; dub?: EpisodeInfo[] };
            episodes = subtype === 'sub' ? episodesObj.sub ?? [] : episodesObj.dub ?? [];
          } else {
            episodes = providerData.episodes as EpisodeInfo[];
          }
      }
      setCurrentEpisodes(episodes);
      // ✅ Khi nhận được dữ liệu mới, tắt trạng thái loading của nút refresh
      prevAllProvidersData.current = allProvidersData;
    }
  }, [allProvidersData, onprovider, subtype]);

  // ✅ Giữ lại: useEffect cho việc phân trang
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const slicedEp = currentEpisodes?.slice(startIndex, endIndex) || [];
    setFilteredEp(slicedEp);
  }, [currentEpisodes, currentPage]);

  // ✅ Giữ lại: useEffect tự động nhảy trang
  useEffect(() => {
    if (epnum) {
      const calculatedPage = Math.ceil(epnum / itemsPerPage);
      setCurrentPage(calculatedPage <= 0 ? 1 : calculatedPage);
    }
  }, [epnum]);

  // ✅ Giữ lại: useEffect lấy tùy chọn layout từ localStorage
  useEffect(() => {
    const listType = localStorage.getItem('eplisttype');
    if (listType) {
      setEpListType(parseInt(listType, 10));
    }
  }, []);

  // ✅ Giữ lại: Các hàm quản lý UI
  const handleOptionClick = (option: number) => {
    setEpListType(option);
    localStorage.setItem('eplisttype', option.toString());
  };

  const reverseToggle = () => {
    setCurrentPage(1);
    setCurrentEpisodes(prev => (prev ? [...prev].reverse() : null));
  };
  
  // ✅ Hàm đổi provider đã được VIẾT LẠI
  const handleProviderChange = (newProvider: string, newSubtype: string = "sub") => {
    const providerData = allProvidersData?.find(p => p.providerId === newProvider);
    if (!providerData) {
        toast.error("Không tìm thấy server được chọn.");
        return;
    }
    
    let episodes: EpisodeInfo[] = [];
    if (providerData.consumet) {
        const episodesObj = providerData.episodes as { sub?: EpisodeInfo[]; dub?: EpisodeInfo[] };
        episodes = newSubtype === 'sub' ? episodesObj.sub ?? [] : episodesObj.dub ?? [];
    } else {
        episodes = providerData.episodes as EpisodeInfo[];
    }
    
    const targetEpisode = episodes.find(e => e.number === epnum);

    if (targetEpisode?.id || targetEpisode?.episodeId) {
        router.push(`/anime/watch?id=${id}&host=${newProvider}&epid=${targetEpisode.id || targetEpisode.episodeId}&ep=${epnum}&type=${newSubtype}`);
    } else {
        const firstEpisode = episodes[0];
        if (firstEpisode?.id || firstEpisode?.episodeId) {
            toast.info(`Không tìm thấy tập ${epnum}, chuyển về tập đầu tiên.`);
            router.push(`/anime/watch?id=${id}&host=${newProvider}&epid=${firstEpisode.id || firstEpisode.episodeId}&ep=${firstEpisode.number}&type=${newSubtype}`);
        } else {
            toast.error("Không có tập phim nào ở server này.");
        }
    }
  };

    // ✅ Hàm refresh đã được SỬA LẠI
  const refreshEpisodes = () => {
    if (refreshLoading) return; // Ngăn người dùng bấm liên tục
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
            {subOptions?.includes('sub') && (
              <div className={styles.episodesub}>
                <span className={styles.episodetypes}>
                  <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M4.6661 6.66699C4.29791 6.66699 3.99943 6.96547 3.99943 7.33366V24.667C3.99943 25.0352 4.29791 25.3337 4.6661 25.3337H27.3328C27.701 25.3337 27.9994 25.0352 27.9994 24.667V7.33366C27.9994 6.96547 27.701 6.66699 27.3328 6.66699H4.6661ZM8.66667 21.3333C8.29848 21.3333 8 21.0349 8 20.6667V11.3333C8 10.9651 8.29848 10.6667 8.66667 10.6667H14C14.3682 10.6667 14.6667 10.9651 14.6667 11.3333V12.6667C14.6667 13.0349 14.3682 13.3333 14 13.3333H10.8C10.7264 13.3333 10.6667 13.393 10.6667 13.4667V18.5333C10.6667 18.607 10.7264 18.6667 10.8 18.6667H14C14.3682 18.6667 14.6667 18.9651 14.6667 19.3333V20.6667C14.6667 21.0349 14.3682 21.3333 14 21.3333H8.66667ZM18 21.3333C17.6318 21.3333 17.3333 21.0349 17.3333 20.6667V11.3333C17.3333 10.9651 17.6318 10.6667 18 10.6667H23.3333C23.7015 10.6667 24 10.9651 24 11.3333V12.6667C24 13.0349 23.7015 13.3333 23.3333 13.3333H20.1333C20.0597 13.3333 20 13.393 20 13.4667V18.5333C20 18.607 20.0597 18.6667 20.1333 18.6667H23.3333C23.7015 18.6667 24 18.9651 24 19.3333V20.6667C24 21.0349 23.7015 21.3333 23.3333 21.3333H18Z"
                      fill="currentColor"
                    />
                  </svg>
                  SUB:
                </span>
                {allProvidersData?.map((item) => (
                  <div
                    key={item.providerId}
                    className={item.providerId === onprovider  && subtype === 'sub' ? styles.providerselected : styles.provider}
                    onClick={() => handleProviderChange(item.providerId, "sub")}
                  >
                    {item.providerId}
                  </div>
                ))}
              </div>
            )}
            {subOptions?.includes('dub') && (
              <div className={styles.episodedub}>
                <span className={styles.episodetypes}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3m7 9c0 3.53-2.61 6.44-6 6.93V21h-2v-3.07c-3.39-.49-6-3.4-6-6.93h2a5 5 0 0 0 5 5a5 5 0 0 0 5-5z"
                    />
                  </svg>
                  DUB:
                </span>
                {allProvidersData?.map((item) => {
                    const hasDub = item.consumet ? (item.episodes as any)?.dub?.length > 0 : subOptions.includes('dub');
                    if (!hasDub) return null;
                    return (
                    <div
                        key={`${item.providerId}-dub`}
                        className={item.providerId === onprovider && subtype === 'dub' ? styles.providerselected : styles.provider}
                        onClick={() => handleProviderChange(item.providerId, "dub")}
                    >
                        {item.providerId}
                    </div>
                    );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      <div className={styles.episodebottom}>
        {isLoading ? (
            // 1. Nếu đang loading, chỉ hiển thị Skeleton
            <Skeleton className="bg-[#18181b] w-full h-[200px] rounded-lg" />
        ) : currentEpisodes && currentEpisodes.length > 0 ? (
            // 2. Nếu không loading VÀ có tập phim, hiển thị danh sách
            <>
            <div className={styles.episodetitle}>
              <div className={styles.epleft}>
                <h3 className={styles.epheading}>Danh sách tập</h3>
                <Tooltip content="Refresh Episodes">
                  <button className={styles.refresh} onClick={refreshEpisodes}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className={`w-[22px] h-[22px] ${refreshLoading ? "animate-spin" : ""}`}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke={epListType === 2 ? '#ca1313' : 'currentColor'}
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122"
                    />
                  </svg>
                </span>
                <span
                  className={`cursor-pointer ${epListType === 3 ? 'selected' : ''}`}
                  onClick={() => handleOptionClick(3)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke={epListType === 3 ? '#ca1313' : 'currentColor'}
                    className="w-6 h-6"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                  </svg>
                </span>
                <span onClick={reverseToggle} className="cursor-pointer">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
                    />
                  </svg>
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
            // 3. Nếu không loading VÀ không có tập phim, hiển thị "No episodes found"
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