/** @type {import('next').NextConfig} */
// Ẩn log request `/api/translate` ở chế độ dev
if (process.env.NODE_ENV === "development") {
  const originalLog = console.log;
  console.log = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].startsWith("POST /api/translate")
    ) {
      return; // bỏ qua log spam này
    }
    originalLog(...args);
  };
}
const nextConfig = {
    images: {
        domains: ['s4.anilist.co','artworks.thetvdb.com','media.kitsu.io', 'image.tmdb.org', 'img.anili.st'],
        unoptimized: true
      },
    //   async headers() {
    //     return [
    //         {
    //             source: "/api/:path*",
    //             headers: [
    //                 { key: "Access-Control-Allow-Credentials", value: "true" },
    //                 { key: "Access-Control-Allow-Origin", value: "*" }, // replace this your actual origin
    //                 { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
    //                 { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
    //             ]
    //         }
    //     ]
    // },
    typescript: {
      // !! WARN !!
      // Dangerously allow production builds to successfully complete even if
      // your project has type errors.
      // !! WARN !!
      ignoreBuildErrors: true,
    },
  }
module.exports = nextConfig;
