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
  nowPlaying?: NowPlaying;
  setNowPlaying: (nowPlaying: NowPlaying) => void;
}

export const useNowPlaying = create<NowPlayingState>()((set) => ({
    nowPlaying: undefined,
    setNowPlaying: (nowPlaying) => set({ nowPlaying }),
}));

// 6. DataInfo Store
interface DataInfoState {
    dataInfo?: AnimeItem;
    setDataInfo: (dataInfo: AnimeItem) => void;
}
// dùng để lưu thông tin anime, như title, coverImage, description, v.v.
// sử dụng đề xuất anime cùng thể loại với anime đang xem
// sử dụng thông tin anime chi tiết trong page watching
//  Nút "Thêm vào danh sách yêu thích" ❤️
// Nút "Chia sẻ lên mạng xã hội"
export const useDataInfo = create<DataInfoState>()((set) => ({
    dataInfo: undefined,
    setDataInfo: (dataInfo) => set({ dataInfo }),
}));
