// Bỏ luôn import Profile (vì không tồn tại trong next-auth)
import NextAuth, { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/mongodb/db";
import { getServerSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { User } from "next-auth";
import { type Session } from "next-auth";


interface ExtendedUser extends User {
    token: string;
    image: {
        large?: string;
        medium?: string;
    };
    createdAt: number;
    list: string[];
}

interface AniListResponse {
    data: {
        Viewer: {
        id: string;
        name: string;
        avatar: {
            large: string;
            medium: string;
        };
        bannerImage?: string;
        createdAt: number;
        mediaListOptions: {
            animeList: {
            customLists: string[];
            };
        };
        };
    };
}

export const authOptions: NextAuthOptions = {
    adapter: MongoDBAdapter(clientPromise),
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        {
        id: "AniListProvider",
        name: "AniList",
        type: "oauth",
        token: "https://anilist.co/api/v2/oauth/token",
        authorization: {
            url: "https://anilist.co/api/v2/oauth/authorize",
            params: { scope: "", response_type: "code" },
        },
        userinfo: {
            url: process.env.GRAPHQL_ENDPOINT as string,
            async request(context) {
            const accessToken = (context as { tokens?: { access_token?: string } }).tokens?.access_token;
            if (!accessToken) {
                throw new Error("No access token from AniList");
            }

            const res = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
                },
                body: JSON.stringify({
                query: `
                    query {
                    Viewer {
                        id
                        name
                        avatar {
                        large
                        medium
                        }
                        bannerImage
                        createdAt
                        mediaListOptions {
                        animeList {
                            customLists
                        }
                        }
                    }
                    }
                `,
                }),
            });

            const json: AniListResponse = await res.json();
            const viewerData = json.data.Viewer;

            return {
                sub: viewerData.id.toString(),
                name: viewerData.name,
                image: viewerData.avatar?.large || viewerData.avatar?.medium || "",
                token: accessToken,
                createdAt: viewerData.createdAt,
                list: viewerData.mediaListOptions?.animeList?.customLists || [],
            };
            },
        },
        clientId: process.env.ANILIST_CLIENT_ID as string,
        clientSecret: process.env.ANILIST_CLIENT_SECRET as string,
        profile(profile): ExtendedUser {
            return {
            id: profile.sub,
            name: profile.name,
            image: { large: profile.image, medium: profile.image },
            token: profile.token,
            createdAt: profile.createdAt,
            list: profile.list,
            };
        },
        },
    ],
    session: { strategy: "jwt" },
    callbacks: {
        async jwt({ token, user }) {
        return { ...token, ...user };
        },
        async session({ session, token }: { session: Session; token: JWT }) {
        session.user = token as Session["user"];
        return session;
        },
    },
};

const handler = NextAuth(authOptions);
export const getAuthSession = () => getServerSession(authOptions);
export { handler as GET, handler as POST };
