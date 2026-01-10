// app/api/stream/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// ✅ Whitelist origins
const ALLOWED_ORIGINS = [
  'megacloud.blog',
  'netmagcdn.com',
  'mgstatics.xyz',
  'rapid-cloud.co',
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const referer = searchParams.get("referer") || "";

    if (!url) {
      return NextResponse.json({ error: "Thiếu URL" }, { status: 400 });
    }

    // ✅ Check whitelist
    try {
      const hostname = new URL(url).hostname;
      const isAllowed = ALLOWED_ORIGINS.some(origin => hostname.includes(origin));
      if (!isAllowed) {
        console.warn(`🚫 Origin not allowed: ${hostname}`);
        return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Referer: referer,
      Origin: referer ? new URL(referer).origin : "",
      Host: new URL(url).host,
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "video",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      DNT: "1",
      "Sec-Ch-Ua": `"Not/A)Brand";v="8", "Chromium";v="115", "Google Chrome";v="115"`,
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": `"Windows"`,
    };

    const response = await axios.get(url, {
      headers,
      responseType: "arraybuffer",
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      console.error("❌ Upstream lỗi:", {
        status: response.status,
        headers: response.headers,
        data: response.data.toString("utf8").slice(0, 300),
      });
      return NextResponse.json(
        { error: "Upstream error", status: response.status },
        { status: 500 }
      );
    }

    let contentType = response.headers["content-type"] || "";

    if (url.endsWith(".m3u8")) {
      contentType = "application/vnd.apple.mpegurl";
      let playlist = response.data.toString("utf8");
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);

      // ✅ LOGIC MỚI: Phát hiện Master Playlist vs Media Playlist
      const isMasterPlaylist = 
        playlist.includes("#EXT-X-STREAM-INF") || 
        playlist.includes("#EXT-X-I-FRAME-STREAM-INF");

      if (isMasterPlaylist) {
        console.log("📋 Master playlist detected, rewriting variant URLs...");
        
        // ✅ Rewrite variant playlist URLs (relative & absolute)
        playlist = playlist.split('\n').map((line: string) => {
          // Bỏ qua comment lines
          if (line.startsWith('#')) {
            // ✅ Handle I-FRAME with URI parameter
            if (line.includes('URI=')) {
              return line.replace(/URI="([^"]+)"/g, (_match: string, variantUrl: string) => {
                let fullUrl: string;
                if (variantUrl.startsWith('http')) {
                  fullUrl = variantUrl;
                } else {
                  fullUrl = new URL(variantUrl, baseUrl).href;
                }
                const proxiedUrl = `/api/stream?url=${encodeURIComponent(fullUrl)}&referer=${encodeURIComponent(referer)}`;
                return `URI="${proxiedUrl}"`;
              });
            }
            return line;
          }
          
          // ✅ Rewrite variant URLs (không phải comment)
          if (line.trim() && !line.startsWith('#')) {
            let variantUrl: string;
            if (line.startsWith('http')) {
              variantUrl = line;
            } else {
              variantUrl = new URL(line.trim(), baseUrl).href;
            }
            return `/api/stream?url=${encodeURIComponent(variantUrl)}&referer=${encodeURIComponent(referer)}`;
          }
          
          return line;
        }).join('\n');

      } else {
        console.log("📄 Media playlist detected, rewriting segment URLs...");
        
        // ✅ Rewrite segment URLs (existing logic)
        playlist = playlist.replace(/^(?!#)(.*)$/gm, (match: string) => {
          if (!match.trim()) return match; // Bỏ qua dòng trống
          
          let segmentUrl: string;
          if (match.startsWith("http")) {
            segmentUrl = match;
          } else {
            segmentUrl = new URL(match, baseUrl).href;
          }
          return `/api/stream?url=${encodeURIComponent(segmentUrl)}&referer=${encodeURIComponent(referer)}`;
        });
      }

      return new NextResponse(playlist, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // ✅ Handle TS segments, encryption keys, etc.
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    console.error("❌ Lỗi stream:", (error as Error)?.message);
    return NextResponse.json(
      { error: "Không lấy được stream", detail: (error as Error)?.message },
      { status: 500 }
    );
  }
}