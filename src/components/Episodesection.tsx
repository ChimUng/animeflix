"use client"
import React, { useEffect, useMemo, useState } from "react";
import { Select, SelectItem, Tooltip } from "@nextui-org/react";
import styles from '../styles/Episodesection.module.css'
import { getEpisodes } from "@/lib/getData";
import { ProvidersMap, getSubOptionsForProvider } from "@/utils/EpisodeFunctions";
import EpImageList from "./Episodelists/EpImageList";
import EpNumList from "./Episodelists/EpNumList";
import EpImgContent from "./Episodelists/EpImgContent";
import { toast } from "sonner";
import { useSubtype, useEpListType } from '@/lib/store';
import { useStore } from 'zustand';
import { AnimeItem } from '@/types/anime';
import { Episode, Provider } from '@/types/episode';
import {
    EpRefreshIcon,
    EpReverseIcon,
    EpGridIcon,
    EpCardListIcon,
    EpCompactListIcon,
    EpFilterToggleIcon,
} from "@/lib/SvgIcons";
import { buildWatchUrl } from "@/utils/watchUrl";

interface Props {
    data: AnimeItem;
    id: string | number;
    progress: number;
    setUrl: (url: string | null) => void;
}

// Chỉ đổi label hiển thị UI, providerId thật (dùng trong url/watch, getSources...) giữ nguyên.
const PROVIDER_LABELS: Record<string, string> = {
    anineko: 'Eng',
    animehay: 'Viet',
};

const Episodesection: React.FC<Props> = ({ data, id, progress, setUrl }) => {
    const subtype = useStore(useSubtype, (state) => state.subtype);
    const setSubType = useSubtype((state) => state.setSubType);
    const eplisttype = useStore(useEpListType, (state) => state.eplisttype);
    const setEplistType = useEpListType((state) => state.setEplistType);

    const [loading, setloading] = useState(true);
    const [showSelect, setShowSelect] = useState(false);
    const [defaultProvider, setdefaultProvider] = useState<string>("");
    const [episodeData, setEpisodeData] = useState<Provider[] | null>(null);
    const [currentEpisodes, setCurrentEpisodes] = useState<Episode[]>([]);

    // selectedRange + reversed chỉ là "cách hiển thị", KHÔNG mutate mảng episode gốc.
    // filteredEpisodes luôn derive lại từ currentEpisodes + 2 giá trị này (useMemo dưới đây),
    // nên đổi range không còn làm mất trạng thái đảo thứ tự như code cũ.
    const [selectedRange, setSelectedRange] = useState("1-100");
    const [reversed, setReversed] = useState(false);

    const toggleShowSelect = () => setShowSelect(!showSelect);

    const handleSubDub = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSubType(e.target.value);
    };

    const handleOptionClick = (option: number) => {
        setEplistType(option);
    };

    // provider object hiện đang chọn — nguồn duy nhất để tính suboptions/dubLength,
    // recompute mỗi khi đổi provider (khác code cũ chỉ tính 1 lần lúc load).
    const currentProviderObj = useMemo(
        () => episodeData?.find((p) => p.providerId === defaultProvider) ?? null,
        [episodeData, defaultProvider]
    );
    const { suboptions, dubLength: dubcount } = useMemo(
        () => getSubOptionsForProvider(currentProviderObj),
        [currentProviderObj]
    );

    useEffect(() => {
        const fetchepisodes = async () => {
        try {
            const response = await getEpisodes(id.toString(), data?.status ?? "FINISHED", false);
            setEpisodeData(response ?? null);
            if (response) {
            ProvidersMap(response, defaultProvider, setdefaultProvider);
            }
            setloading(false);
        } catch (error) {
            console.log(error);
            setloading(false);
        }
        };

        if (data?.type !== "MANGA" && data?.status !== "NOT_YET_RELEASED") {
        fetchepisodes();
        }
    }, [data?.id]);

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setdefaultProvider(e.target.value);
    };

    // ✅ Fix: subtype persist qua zustand (localStorage) không tự biết đổi theo provider.
    // Vd đang ở Gogoanime chọn 'dub', chuyển sang Anineko/Animepahe (suboptions chỉ có ['sub'])
    // -> subtype vẫn kẹt 'dub' cũ -> nhánh lọc dưới trả mảng rỗng -> UI hiện nhầm
    // "Anime hiện không khả dụng" dù provider có đủ tập. Tự reset về option hợp lệ đầu tiên.
    useEffect(() => {
        if (suboptions.length > 0 && !suboptions.includes(subtype)) {
            setSubType(suboptions[0]);
        }
    }, [suboptions, subtype, setSubType]);

    useEffect(() => {
        const provider = episodeData?.find((i) => i.providerId === defaultProvider);
        let filteredEp: Episode[] = [];

        if (provider) {
        if (provider.consumet) {
            if (!Array.isArray(provider.episodes)) {
            filteredEp = subtype === "sub" ? provider.episodes.sub ?? [] : provider.episodes.dub ?? [];
            } else {
            filteredEp = provider.episodes;
            }
        } else {
            if (Array.isArray(provider.episodes)) {
            // ✅ Fix: trước đây dùng `.slice(0, dubcount)` giả định dub luôn liên tục từ tập 1
            // (đúng kiểu cũ của gogoanime) — với anineko, badges cho biết CHÍNH XÁC tập nào
            // có dub (không nhất thiết liên tục từ đầu), nên lọc trực tiếp theo badges.
            // Provider không có badges (animepahe/animehay/zoro/9anime) -> suboptions chỉ có
            // 'sub' (xem computeFlatArrayOptions) nên nhánh 'dub' sẽ không bao giờ chạy tới.
            filteredEp = subtype === "dub"
                ? provider.episodes.filter((ep) => ep.badges?.includes("DUB"))
                : provider.episodes;
            } else {
            filteredEp = subtype === "dub" ? provider.episodes.dub ?? [] : provider.episodes.sub ?? [];
            }
        }
        }

        setCurrentEpisodes(filteredEp);
    }, [subtype, episodeData, defaultProvider, dubcount]);

    const totalEpisodes = currentEpisodes.length;

    const episodeRangeOptions: { label: string; value: string }[] = [];
    if (totalEpisodes <= 100) {
        episodeRangeOptions.push({ label: `1-${totalEpisodes}`, value: `1-${totalEpisodes}` });
    } else {
        for (let i = 0; i < totalEpisodes; i += 100) {
        const start = i + 1;
        const end = Math.min(i + 100, totalEpisodes);
        const label = `${start}-${end}`;
        episodeRangeOptions.push({ label, value: `${start}-${end}` });
        }
    }

    const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedRange(e.target.value);
    };

    // Đổi provider/subtype -> danh sách tập hoàn toàn khác -> reset range + bỏ đảo thứ tự cũ.
    // ✅ Fix UX: trước đây LUÔN nhảy về bucket đầu "1-100" — với anime dài tập (vd One Piece
    // 1171 tập), user đang xem tới tập 1050 mà đổi provider là phải tự tay chọn lại range
    // "1001-1100". Giờ tính sẵn bucket chứa (progress + 1) làm mặc định.
    useEffect(() => {
        if (currentEpisodes.length === 0) {
            setSelectedRange("1-0");
        } else {
            const target = progress > 0 ? progress + 1 : 1;
            const bucketStart = Math.floor((target - 1) / 100) * 100 + 1;
            const bucketEnd = Math.min(bucketStart + 99, currentEpisodes.length);
            // Phòng trường hợp target vượt quá số tập hiện có (vd progress lệch do đổi provider
            // có ít tập hơn) -> rơi về bucket cuối cùng hợp lệ thay vì range rỗng.
            if (bucketStart > currentEpisodes.length) {
                const lastBucketStart = Math.floor((currentEpisodes.length - 1) / 100) * 100 + 1;
                setSelectedRange(`${lastBucketStart}-${currentEpisodes.length}`);
            } else {
                setSelectedRange(`${bucketStart}-${bucketEnd}`);
            }
        }
        setReversed(false);
    }, [currentEpisodes, progress]);

    const filteredEpisodes = useMemo(() => {
        const [start, end] = selectedRange.split("-").map(Number);
        const rangeEpisodes = currentEpisodes.slice((start || 1) - 1, end || 0);
        return reversed ? [...rangeEpisodes].reverse() : rangeEpisodes;
    }, [currentEpisodes, selectedRange, reversed]);

    const reverseOrder = () => setReversed((prev) => !prev);

    const refreshEpisodes = async () => {
        setloading(true);
        try {
        const response = await getEpisodes(id.toString(), data?.status ?? "FINISHED", true);
        setEpisodeData(response ?? null);
        if (response) {
            ProvidersMap(response, defaultProvider, setdefaultProvider);
        }
        setloading(false);
        toast.success("Episodes refreshed successfully!");
        } catch (error) {
        console.error("Error refreshing episodes:", error);
        toast.error("Oops! Something went wrong. Please refresh the page.");
        setloading(false);
        }
    };

    useEffect(() => {
        if (currentEpisodes.length > 0) {
        const episode = data?.nextAiringEpisode
            ? currentEpisodes.find((i) => i.number === progress + 1)
            : currentEpisodes[0];
        if (episode) {
            const watchurl = buildWatchUrl({
                id: data?.id ?? "",
                provider: defaultProvider,
                epId: episode?.id || episode?.episodeId || "",
                epNum: episode?.number ?? "",
                subdub: subtype,
            });
            setUrl(watchurl);
        } else {
            setUrl(null);
        }
        }
    }, [currentEpisodes, progress, defaultProvider, subtype, data?.id, setUrl]);

    return (
        <div className={styles.episodesection}>
        <div className={styles.eptopsection}>
            <div className={styles.epleft}>
            <div className={styles.cardhead}>
                <span className={styles.bar}></span>
                <h1 className={styles.headtitle}>Tập</h1>
            </div>
            {data?.status !== "NOT_YET_RELEASED" && data?.type !== "MANGA" && (
                <Tooltip content="Refresh Episodes">
                <button className={styles.refresh} onClick={refreshEpisodes}>
                    <EpRefreshIcon className={`w-[22px] h-[22px] ${loading ? "animate-spin" : ""}`} />
                </button>
                </Tooltip>
            )}
            </div>
            {!loading && (
            <div className={styles.epright}>
                <div className={styles.selects}>
                {totalEpisodes > 100 && (
                    <div className="flex flex-col w-[120px] mr-2">
                    <Select
                        label=""
                        aria-label="Episode Range"
                        placeholder="Episodes"
                        labelPlacement="outside"
                        selectedKeys={[selectedRange.toString()]}
                        disallowEmptySelection={true}
                        classNames={{
                        base: "!m-0 !p-0",
                        mainWrapper: "p-0 m-0 h-[34px]",
                        trigger: "m-0 !min-h-[34px] !max-w-[115px] pr-0",
                        value: "",
                        listbox: "m-0 p-0",
                        }}
                        radius="sm"
                        onChange={handleRangeChange}
                    >
                        {episodeRangeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                        ))}
                    </Select>
                    </div>
                )}
                <div className="flex w-[133px] flex-col gap-2 mr-3">
                    <Select
                    label=""
                    aria-label="Switch"
                    placeholder="Select a provider"
                    labelPlacement="outside"
                    selectedKeys={[defaultProvider]}
                    classNames={{
                        base: "!m-0 !p-0",
                        mainWrapper: "p-0 m-0 h-[34px]",
                        trigger: "m-0 !min-h-[34px] !max-w-[128px] pr-0",
                        value: "",
                        listbox: "m-0 p-0",
                    }}
                    radius="sm"
                    onChange={handleProviderChange}
                    disallowEmptySelection={true}
                    isDisabled={!episodeData || episodeData.length === 0}
                    >
                    {episodeData && episodeData.length > 0 ? (
                        episodeData.map((item) => (
                        <SelectItem key={item.providerId} value={item.providerId}>
                            {PROVIDER_LABELS[item.providerId] ?? item.providerId}
                        </SelectItem>
                        ))
                    ) : (
                        <SelectItem key="no-provider" value="no-provider">
                        No providers available
                        </SelectItem>
                    )}
                    </Select>
                </div>
                <div className="flex w-[75px] flex-col gap-2 mr-2">
                    <Select
                    label=""
                    aria-label="Switch"
                    placeholder="Switch"
                    labelPlacement="outside"
                    selectedKeys={[subtype]}
                    classNames={{
                        base: "!m-0 !p-0",
                        mainWrapper: "p-0 m-0 !h-[34px]",
                        trigger: "m-0 !min-h-[34px] !max-w-[70px] pr-0",
                        value: "",
                        listbox: "m-0 p-0",
                    }}
                    radius="sm"
                    onChange={handleSubDub}
                    disallowEmptySelection={true}
                    >
                    {suboptions.map((type) => (
                        <SelectItem key={type} value={type}>
                        {type}
                        </SelectItem>
                    ))}
                    </Select>
                </div>
                </div>
                <div className={styles.epchangeicons}>
                <div className={styles.epchangeopt}>
                    <span
                    className={`mx-[6px] cursor-pointer ${eplisttype === 1 ? "selected" : ""}`}
                    onClick={() => handleOptionClick(1)}
                    >
                    <EpGridIcon
                        className="w-6 h-6"
                        stroke={eplisttype === 1 ? "#ca1313" : "currentColor"}
                    />
                    </span>
                    <span
                    className={`mx-[6px] cursor-pointer ${eplisttype === 2 ? "selected" : ""}`}
                    onClick={() => handleOptionClick(2)}
                    >
                    <EpCardListIcon
                        className="w-6 h-6"
                        stroke={eplisttype === 2 ? "#ca1313" : "currentColor"}
                    />
                    </span>
                    <span
                    className={`mx-[6px] cursor-pointer ${eplisttype === 3 ? "selected" : ""}`}
                    onClick={() => handleOptionClick(3)}
                    >
                    <EpCompactListIcon
                        className="w-6 h-6"
                        stroke={eplisttype === 3 ? "#ca1313" : "currentColor"}
                    />
                    </span>
                </div>
                <Tooltip content={reversed ? "Đang đảo thứ tự" : "Đảo thứ tự"}>
                    <button className={styles.refresh} onClick={reverseOrder}>
                    <EpReverseIcon className="w-[22px] h-[22px]" />
                    </button>
                </Tooltip>
                <span className={styles.toggleicons} onClick={toggleShowSelect}>
                    <EpFilterToggleIcon className="w-6 h-6" />
                </span>
                </div>
            </div>
            )}
        </div>
        {showSelect && (
            <div className={styles.selectmobile}>
            <div className="flex w-[75px] flex-col gap-2 mr-2">
                <Select
                label=""
                aria-label="Switch"
                placeholder="Switch"
                labelPlacement="outside"
                selectedKeys={[subtype]}
                classNames={{
                    base: "!m-0 !p-0",
                    mainWrapper: "p-0 m-0 !h-[34px]",
                    trigger: "m-0 !min-h-[34px] !max-w-[70px] pr-0",
                    value: "",
                    listbox: "m-0 p-0",
                }}
                radius="sm"
                onChange={handleSubDub}
                disallowEmptySelection={true}
                >
                {suboptions.map((type) => (
                    <SelectItem key={type} value={type}>
                    {type}
                    </SelectItem>
                ))}
                </Select>
            </div>
            {totalEpisodes > 100 && (
                <div className="flex flex-col w-[120px] mr-2">
                <Select
                    label=""
                    aria-label="Episode Range"
                    placeholder="Episodes"
                    labelPlacement="outside"
                    selectedKeys={[selectedRange.toString()]}
                    disallowEmptySelection={true}
                    classNames={{
                    base: "!m-0 !p-0",
                    mainWrapper: "p-0 m-0 h-[34px]",
                    trigger: "m-0 !min-h-[34px] !max-w-[115px] pr-0",
                    value: "",
                    listbox: "m-0 p-0",
                    }}
                    radius="sm"
                    onChange={handleRangeChange}
                >
                    {episodeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                    ))}
                </Select>
                </div>
            )}
            <div className="flex w-[133px] flex-col gap-2 mr-3">
                <Select
                label=""
                aria-label="Switch"
                placeholder="Select a provider"
                labelPlacement="outside"
                selectedKeys={[defaultProvider]}
                classNames={{
                    base: "!m-0 !p-0",
                    mainWrapper: "p-0 m-0 h-[34px]",
                    trigger: "m-0 !min-h-[34px] !max-w-[128px] pr-0",
                    value: "",
                    listbox: "m-0 p-0",
                }}
                radius="sm"
                onChange={handleProviderChange}
                disallowEmptySelection={true}
                isDisabled={!episodeData || episodeData.length === 0}
                >
                {episodeData && episodeData.length > 0 ? (
                    episodeData.map((item) => (
                    <SelectItem key={item.providerId} value={item.providerId}>
                        {PROVIDER_LABELS[item.providerId] ?? item.providerId}
                    </SelectItem>
                    ))
                ) : (
                    <SelectItem key="no-provider" value="no-provider">
                    No providers available
                    </SelectItem>
                )}
                </Select>
            </div>
            </div>
        )}
        {loading && (
            <>
            {data?.type === "MANGA" ? (
                <div className="text-[17px] font-semibold">
                <p className="text-center mt-4">Coming Soon!</p>
                <p className="text-center mb-4">Cannot Fetch Manga, Feature Coming Soon.</p>
                </div>
            ) : data?.status === "NOT_YET_RELEASED" ? (
                <div className="text-[17px] font-semibold">
                <p className="text-center mt-4">Coming Soon!</p>
                <p className="text-center mb-4">
                    {`Sorry, this anime isn't out yet. Keep an eye out for updates!`}
                </p>
                </div>
            ) : (
                <div className="text-[17px] font-semibold">
                <p className="text-center mt-4 mb-1">Please Wait...</p>
                <p className="text-center mb-4">Loading Episode Data</p>
                </div>
            )}
            </>
        )}
        {!loading && filteredEpisodes.length === 0 && (
            <div className="text-[17px] font-semibold">
            <p className="text-center mt-4">Oh no!</p>
            <p className="text-center mb-4">
                This anime is currently unavailable. Check back later for updates!
            </p>
            </div>
        )}
        {!loading && filteredEpisodes.length > 0 && (
            <>
            {eplisttype === 3 && (
                <div className={styles.epnumlist}>
                <EpNumList
                    data={data}
                    epdata={filteredEpisodes}
                    defaultProvider={defaultProvider}
                    subtype={subtype}
                    epnum={progress}
                />
                </div>
            )}
            {eplisttype === 2 && (
                <div className={styles.epimgconist}>
                <EpImgContent
                    data={data}
                    epdata={filteredEpisodes}
                    defaultProvider={defaultProvider}
                    subtype={subtype}
                    epnum={progress}
                    progress={progress}
                />
                </div>
            )}
            {eplisttype === 1 && (
                <div className={styles.epimagelist}>
                <EpImageList
                    data={data}
                    epdata={filteredEpisodes}
                    defaultProvider={defaultProvider}
                    subtype={subtype}
                    progress={progress}
                />
                </div>
            )}
            </>
        )}
        </div>
    );
};

export default Episodesection