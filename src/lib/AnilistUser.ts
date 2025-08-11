import { notifications, playeranimeinfo, userlists, userprofile } from "./anilistqueries";
import { toast } from "sonner";

// Type cơ bản
type GraphQLResponse<T> = {
    data: T;
};

type NotificationData = {
    Page: {
    notifications: any[];
};
};

type WatchPageInfoData = {
    Media: any;
};

type MediaListEntry = {
    id: number;
    mediaId: number;
    progress: number;
    status: string;
};

type UserListData = {
    Media: {
    mediaListEntry: MediaListEntry;
};
};

type UserProfileData = {
    MediaListCollection: any;
};

// Hàm fetch chung
const GraphQlClient = async <T>(
    token: string,
    query: string,
    variables?: Record<string, any>
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

        const data: GraphQLResponse<NotificationData> = await response.json();
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
