import { notifications, playeranimeinfo, userlists, userprofile } from "./anilistqueries";
import { toast } from "sonner";
import type { GraphQLResponse, NotificationData, WatchPageInfoData, MediaListEntry, UserListData, UserProfileData, } from "@/types/anilist";

// re-export để các file cũ (AnimeDetailsTop.tsx, Addtolist.tsx...) import từ '@/lib/AnilistUser' không bị vỡ
export type {
    AiringNotification,
    RelatedMediaAdditionNotification,
    MediaDataChangeNotification,
    MediaMergeNotification,
    MediaDeletionNotification,
    AniListNotification,
    MediaListEntry,
    MediaListCollection,
} from "@/types/anilist";

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
            variables: { page: currentPage, perPage: 15 },
        }),
        });

        const data = await response.json();
        return data.data.Page;
    } catch (error) {
        console.error("Error fetching notifications from AniList:", error);
    }
};

export const WatchPageInfo = async (
    token: string,
    animeid: number
    ): Promise<WatchPageInfoData["Media"] | undefined> => {
    try {
        const response = await fetch("https://graphql.anilist.co", {
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
        });

        const data: GraphQLResponse<WatchPageInfoData> = await response.json();
        return data.data.Media;
    } catch (error) {
        console.error("Error fetching anime info from AniList:", error);
    }
};

// Lấy tiến độ xem thật của user cho 1 anime (đây là hàm DetailsContainer cần gọi)
export const getUserLists = async (
    token: string,
    id: number
    ): Promise<MediaListEntry | undefined> => {
    const res = await GraphQlClient<UserListData>(token, userlists, { id });
    return res?.data?.Media?.mediaListEntry;
};

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

    const variables = { mediaId: id, progress: progress, progressVolumes: 0 };

    try {
        await GraphQlClient(token, updatelistprogress, variables);
        toast.success("Episode progress saved successfully");
    } catch (error) {
        console.error("An error occurred while updating list", error);
        toast.error("An error occurred while updating list");
    }
};

export const UserProfile = async (
    token: string,
    username: string
    ): Promise<UserProfileData["MediaListCollection"] | undefined> => {
    const res = await GraphQlClient<UserProfileData>(token, userprofile, { username });
    return res?.data?.MediaListCollection;
};