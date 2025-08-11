import { useState, useEffect } from "react";

// 1. Định nghĩa một interface cho cấu trúc dữ liệu của tiến trình video
//    Dựa trên các cuộc trò chuyện trước, đây là cấu trúc có thể có.
//    Bạn có thể tùy chỉnh lại cho chính xác với dữ liệu của mình.
export interface VideoProgressData {
  aniId: string;
  aniTitle?: string;
  epTitle?: string;
  image?: string;
  epId: string;
  epNum: number;
  timeWatched: number;
  duration: number;
  provider?: string;
  nextepId?: string | null;
  nextepNum?: number | null;
  subtype?: string;
  createdAt?: string;
}

// 2. Định nghĩa một kiểu cho đối tượng settings, là một bản ghi (Record)
//    với key là ID (string) và value là dữ liệu tiến trình.
type VideoSettings = Record<string, VideoProgressData>;

// 3. Định nghĩa kiểu trả về của hook, là một tuple.
type VideoProgressHook = [
  (id: string) => VideoProgressData | undefined,
  (id: string, data: VideoProgressData) => void
];

function VideoProgressSave(): VideoProgressHook {
  // 4. Định kiểu cho state
  const [settings, setSettings] = useState<VideoSettings>(() => {
    // 5. Thêm kiểm tra để đảm bảo code chỉ chạy ở phía client (trình duyệt)
    //    vì localStorage không tồn tại trên server (SSR trong Next.js).
    if (typeof window === "undefined") {
      return {};
    }

    try {
      const storedSettings = localStorage.getItem("vidstack_settings");
      return storedSettings ? JSON.parse(storedSettings) : {};
    } catch (error) {
      console.error("Failed to parse settings from localStorage", error);
      return {};
    }
  });

  // Đồng bộ state với localStorage mỗi khi `settings` thay đổi
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vidstack_settings", JSON.stringify(settings));
      } catch (error) {
        console.error("Failed to save settings to localStorage", error);
      }
    }
  }, [settings]);

  // 6. Định kiểu cho các tham số và giá trị trả về của hàm
  const getVideoProgress = (id: string): VideoProgressData | undefined => {
    return settings[id];
  };

  const UpdateVideoProgress = (id: string, data: VideoProgressData): void => {
    // Sử dụng callback để đảm bảo luôn lấy state mới nhất
    setSettings(prevSettings => ({
      ...prevSettings,
      [id]: data
    }));
  };

  return [getVideoProgress, UpdateVideoProgress];
}

export default VideoProgressSave;