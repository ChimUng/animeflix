// app/api/stream/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const referer = searchParams.get("referer") || "";

    if (!url) {
      return NextResponse.json({ error: "Thiếu URL" }, { status: 400 });
    }

    // Forward headers quan trọng
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      Accept: "*/*",
      Referer: referer,
      Origin: referer ? new URL(referer).origin : "",
    };

    const response = await axios.get(url, {
      headers,
      responseType: "arraybuffer",
    });

    let contentType = response.headers["content-type"] || "";
    if (url.endsWith(".m3u8")) {
      contentType = "application/vnd.apple.mpegurl";

      // Chuyển text sang string để rewrite
      let playlist = response.data.toString();

      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);

      playlist = playlist.replace(/^(?!#)(.*)$/gm, (match: string) => {
        if (match.startsWith("http")) return match;
        const absUrl = new URL(match, baseUrl).href;
        return `/api/stream?url=${encodeURIComponent(absUrl)}&referer=${encodeURIComponent(referer)}`;
      });

      return new NextResponse(playlist, {
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Forward segment/video
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("❌ Lỗi stream:", error.message);
    return NextResponse.json(
      { error: "Không lấy được stream", detail: error.message },
      { status: 500 }
    );
  }
}
