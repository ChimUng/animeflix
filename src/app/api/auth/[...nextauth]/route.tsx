import NextAuth, { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/mongodb/db";
import { getServerSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { Session, User } from "next-auth";

interface ExtendedUser extends User {
    token: string;
    image: any;
    createdAt: number;
    list: string[];
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
            async request(context: any) {
            const { data } = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${context.tokens.access_token}`,
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
            }).then((res) => res.json());

            const userLists = data.Viewer?.mediaListOptions.animeList.customLists;
            let customLists = userLists || [];

            if (!userLists?.includes("Watched Via Animeflix")) {
                customLists.push("Watched Via Animeflix");
                const fetchGraphQL = async (query: string, variables: any) => {
                const response = await fetch("https://graphql.anilist.co/", {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json",
                    ...(context.tokens.access_token && {
                        Authorization: `Bearer ${context.tokens.access_token}`,
                    }),
                    Accept: "application/json",
                    },
                    body: JSON.stringify({ query, variables }),
                });
                return response.json();
                };

                const setList = `
                mutation($lists: [String]) {
                    UpdateUser(animeListOptions: { customLists: $lists }) {
                    id
                    }
                }
                `;
                await fetchGraphQL(setList, { lists: customLists });
            }

            return {
                token: context.tokens.access_token,
                name: data.Viewer.name,
                sub: data.Viewer.id,
                image: data.Viewer.avatar,
                createdAt: data.Viewer.createdAt,
                list: data.Viewer?.mediaListOptions.animeList.customLists,
            };
            },
        },
        clientId: process.env.ANILIST_CLIENT_ID as string,
        clientSecret: process.env.ANILIST_CLIENT_SECRET as string,
        profile(profile: any) {
            return {
            token: profile.token,
            id: profile.sub,
            name: profile?.name,
            image: profile.image,
            createdAt: profile?.createdAt,
            list: profile?.list,
            } as ExtendedUser;
        },
        },
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
        return { ...token, ...user };
        },
        async session({ session, token }) {
        session.user = token as any;
        return session;
        },
    },
};

const handler = NextAuth(authOptions);

export const getAuthSession = () => getServerSession(authOptions);

export { handler as GET, handler as POST };
