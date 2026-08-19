import NextAuth, { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/mongodb/db";
import { getServerSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { User } from "next-auth";
import { type Session } from "next-auth";
import { connectMongo } from "@/mongodb/db";
import UserModel from "@/mongodb/models/users";

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

const BOSS_ANILIST_IDS = (process.env.BOSS_ANILIST_IDS ?? "").split(",").filter(Boolean);

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

            if (BOSS_ANILIST_IDS.includes(viewerData.id.toString())) {
                try {
                    await connectMongo();
                    await UserModel.findOneAndUpdate(
                        { name: viewerData.name },
                        { $set: { role: 'boss' } },
                        { upsert: true }
                    );
                } catch (e) {
                    console.error('Gán role Boss thất bại:', e);
                }
            }

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
            if (user) {
                token = { ...token, ...user };
            }

            try {
                await connectMongo();
                const dbUser = await UserModel.findOne({ name: token.name })
                    .select('role badge isBanned')
                    .lean<{ role?: 'user' | 'moderator' | 'boss'; badge?: string; isBanned?: boolean } | null>();

                if (dbUser) {
                    const missing: Partial<{ role: 'user' | 'moderator' | 'boss'; badge: string; isBanned: boolean }> = {};
                    if (dbUser.role === undefined) missing.role = 'user';
                    if (dbUser.badge === undefined) missing.badge = '';
                    if (dbUser.isBanned === undefined) missing.isBanned = false;

                    if (Object.keys(missing).length > 0) {
                        // backfill 1 lần cho document cũ bị thiếu field do adapter tạo ra
                        await UserModel.updateOne({ name: token.name }, { $set: missing });
                    }

                    token.role = dbUser.role ?? missing.role ?? 'user';
                    token.badge = dbUser.badge ?? missing.badge ?? '';
                    token.isBanned = dbUser.isBanned ?? missing.isBanned ?? false;
                }
            } catch (e) {
                console.error('Sync role vào JWT thất bại:', e);
            }

            return token;
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
