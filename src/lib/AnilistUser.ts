import { notifications, playeranimeinfo, userlists, userprofile } from "./anilistqueries";
import { toast } from "sonner";
import {AnimeItem} from "./types";

// Type cơ bản
type GraphQLResponse<T> = {
    data: T;
};

interface BaseNotification {
  id: string;
  type: string;
  createdAt: number;
  media?: {
    id: number;
    title: {
        native?: string;
      romaji?: string;
      english?: string;
    };
    type?: string;
    coverImage?: {
      large?: string;
      extraLarge?: string;
    };
  };
}

export interface AiringNotification extends BaseNotification {
  episode: number;
  contexts: string[];
  animeId: number;
}

export interface RelatedMediaAdditionNotification extends BaseNotification {
  mediaId: number;
  context: string;
}

export interface MediaDataChangeNotification extends BaseNotification {
  mediaId: number;
  context: string;
}

export interface MediaMergeNotification extends BaseNotification {
  mediaId: number;
  context: string;
}

export interface MediaDeletionNotification extends BaseNotification {
  context: string;
  deletedMediaTitle: string;
}

export type AniListNotification =
  | AiringNotification
  | RelatedMediaAdditionNotification
  | MediaDataChangeNotification
  | MediaMergeNotification
  | MediaDeletionNotification;

type NotificationData = {
    Page: {
    notifications: AniListNotification[];
};
};

type WatchPageInfoData = {
    Media: AnimeItem;
};

export type MediaListEntry = {
    id: number;
    status: "CURRENT" | "PLANNING" | "COMPLETED" | "REPEATING" | "PAUSED" | "DROPPED" | null;
    score: number | null;
    progress: number | null;
    repeat: number | null;
    notes: string | null;
    updatedAt: number;
    startedAt?: {
        year: number | null;
        month: number | null;
        day: number | null;
    } | null;
    completedAt?: {
        year: number | null;
        month: number | null;
        day: number | null;
    } | null;
    media: {
    id: number;   // 👈 cái này chính là mediaId
    title: {
      romaji?: string;
      english?: string;
      native?: string;
    };
    coverImage?: {
      extraLarge?: string;
      large?: string;
    };
    bannerImage?: string;
    episodes?: number;
    nextAiringEpisode?: {
      episode: number;
    };
    status?: string;
  };
};

type UserListData = {
    Media: {
    mediaListEntry: MediaListEntry;
};
};

export type MediaListCollection = {
  lists: {
    name: string;
    entries: MediaListEntry[];
  }[];
};

type UserProfileData = {
    MediaListCollection: MediaListCollection;
};

// Hàm fetch chung
const GraphQlClient = async <T>(
    token: string,
    query: string,
    variables?: Record<string, string | number | null | undefined>
    ): Promise<GraphQLResponse<T> | undefined> => {
    try {
        const response = await fetch("https://graphql.anilist.co/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token && { Authorization: "Bearer " + token }),
        },
        body: JSON.stringify({ query, variables }),
        });

        return await response.json();
    } catch (error) {
        console.error("GraphQL Error:", error);
    }
};

// 1. Lấy thông báo người dùng
export const Usernotifications = async (
    token: string,
    currentPage: number
    ): Promise<NotificationData["Page"] | undefined> => {
    try {
        const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
            query: notifications,
            variables: {
            page: currentPage,
            perPage: 15,
            },
        }),
        });

        const data = await response.json();
        return data.data.Page;
    } catch (error) {
        console.error("Error fetching notifications from AniList:", error);
    }
};

// 2. Lấy thông tin anime để play
export const WatchPageInfo = async (
    token: string,
    animeid: number
    ): Promise<WatchPageInfoData["Media"] | undefined> => {
    try {
        const response = await fetch(
        "https://graphql.anilist.co",
        {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token && { Authorization: "Bearer " + token }),
            },
            body: JSON.stringify({
            query: playeranimeinfo,
            variables: { id: animeid },
            }),
        },
        );

        const data: GraphQLResponse<WatchPageInfoData> = await response.json();
        return data.data.Media;
    } catch (error) {
        console.error("Error fetching anime info from AniList:", error);
    }
    };

    // 3. Lấy user lists
export const getUserLists = async (
token: string,
id: number
): Promise<MediaListEntry | undefined> => {
const res = await GraphQlClient<UserListData>(token, userlists, { id });
return res?.data?.Media?.mediaListEntry;
};

// 4. Gửi tiến độ tập đã xem
export const saveProgress = async (
token: string,
id: number,
progress: number
): Promise<void> => {
const updatelistprogress = `
    mutation($mediaId: Int, $progress: Int, $progressVolumes: Int) {
    SaveMediaListEntry(mediaId: $mediaId, progress: $progress, progressVolumes: $progressVolumes) {
        id
        mediaId
        progress
        status
    }
    }
`;

const variables = {
    mediaId: id,
    progress: progress,
    progressVolumes: 0,
};

try {
    await GraphQlClient(token, updatelistprogress, variables);
    toast.success("Episode progress saved successfully");
} catch (error) {
    console.error("An error occurred while updating list", error);
    toast.error("An error occurred while updating list");
}
};

// 5. Lấy profile người dùng
export const UserProfile = async (
    token: string,
    username: string
    ): Promise<UserProfileData["MediaListCollection"] | undefined> => {
    const res = await GraphQlClient<UserProfileData>(token, userprofile, { username });
    return res?.data?.MediaListCollection;
};
