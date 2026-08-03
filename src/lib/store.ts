import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnimeItem } from "@/lib/types";

// 1. Settings Store
interface Settings {
    autoplay: boolean;
    autoskip: boolean;
    autonext: boolean;
    load: string;
    audio: boolean;
    herotrailer: boolean;
    pipedInstance?: string;
    pipedCheckedAt?: number;
}

interface SettingsState {
    settings: Settings;
    setSettings: (settings: Settings) => void;
}

export const useSettings = create<SettingsState>()(
    persist(
        (set) => ({
        settings: {
            autoplay: false,
            autoskip: false,
            autonext: false,
            load: "idle",
            audio: false,
            herotrailer: true,
            pipedInstance: undefined,
            pipedCheckedAt: undefined,
        },
        setSettings: (settings) => set({ settings }),
        }),
        { name: "settings" }
    )
);

// 2. Title Store
interface TitleState {
    animetitle: string;
    setAnimeTitle: (title: string) => void;
}

export const useTitle = create<TitleState>()(
    persist(
        (set) => ({
        animetitle: "english",
        setAnimeTitle: (title) => set({ animetitle: title }),
        }),
        { name: "selectedLanguage" }
    )
);

// 3. Subtype Store
interface SubTypeState {
    subtype: string;
    setSubType: (subtype: string) => void;
}

export const useSubtype = create<SubTypeState>()(
    persist(
        (set) => ({
        subtype: "sub",
        setSubType: (subtype) => set({ subtype }),
        }),
        { name: "selectedType" }
    )
);

// 3b. EpListType Store (trước đây đọc/ghi localStorage thủ công trong Episodesection)
interface EpListTypeState {
    eplisttype: number;
    setEplistType: (eplisttype: number) => void;
}

export const useEpListType = create<EpListTypeState>()(
    persist(
        (set) => ({
        eplisttype: 2,
        setEplistType: (eplisttype) => set({ eplisttype }),
        }),
        { name: "eplisttype" }
    )
);

// 4. Searchbar Store
interface SearchbarState {
    Isopen: boolean;
    setIsOpen: (open: boolean) => void;
}

export const useSearchbar = create<SearchbarState>()((set) => ({
    Isopen: false,
    setIsOpen: (Isopen) => set({ Isopen }),
}));

// 5. NowPlaying Store
interface NowPlaying {
    epId: string;
    provider: string;
    epNum: string;
    subtype: string; 
}

interface NowPlayingState {
    nowPlaying: NowPlaying;   // bỏ ? ở đây
    setNowPlaying: (nowPlaying: NowPlaying) => void;
}

export const useNowPlaying = create<NowPlayingState>()((set) => ({
  nowPlaying: { epId: "", provider: "", epNum: "", subtype: "sub" },
  setNowPlaying: (nowPlaying) => set({ nowPlaying }),
}));

// 6. DataInfo Store
interface DataInfoState {
    dataInfo?: AnimeItem;
    setDataInfo: (dataInfo: AnimeItem) => void;
}

export const useDataInfo = create<DataInfoState>()((set) => ({
    dataInfo: undefined,
    setDataInfo: (dataInfo) => set({ dataInfo }),
}));

/*
Zustand store — là gì và tại sao không truyền prop thẳng

Zustand ở đây đóng 2 vai trò khác nhau, tách theo 2 nhóm:

Nhóm có persist (lưu localStorage) — là preferences của người dùng, tồn tại xuyên phiên:

useSettings — bật/tắt autoplay, autoskip, âm thanh...
useTitle — ngôn ngữ hiển thị title đang chọn (romaji/english/userPreferred)
useSubtype — sub/dub đang chọn

Nhóm không persist — là UI/session state tạm thời, mất khi F5:

useSearchbar — search bar đang mở hay đóng
useNowPlaying — tập đang xem (epId, provider, epNum)
useDataInfo — thông tin anime hiện tại đang xem (dùng để chia sẻ giữa các component xa nhau)

Zustand đóng vai trò tương tự React Context(NextUI, SessionProvider - là ví dụ để cho phép các client component chia sẻ state)
nhưng nhẹ hơn (không gây re-render toàn cây khi 1 giá trị đổi,
nhờ bạn dùng useStore(useTitle, selector) chỉ subscribe đúng phần cần) 
và có thêm persist middleware để lưu localStorage miễn phí (Context không tự có).
*/