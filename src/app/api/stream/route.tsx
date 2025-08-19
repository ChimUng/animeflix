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
    "DNT": "1",
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

      // ✅ LOGIC MỚI: Xử lý lại TẤT CẢ các URL segment
      playlist = playlist.replace(/^(?!#)(.*)$/gm, (match: string) => {
        let segmentUrl: string;
        // Nếu URL đã là tuyệt đối (bắt đầu bằng http), dùng nó luôn
        if (match.startsWith("http")) {
          segmentUrl = match;
        } else {
          // Nếu là tương đối, nối nó với baseUrl
          segmentUrl = new URL(match, baseUrl).href;
        }
        // Bọc URL đã xử lý qua proxy
        return `/api/stream?url=${encodeURIComponent(segmentUrl)}&referer=${encodeURIComponent(referer)}`;
      });

      return new NextResponse(playlist, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
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
