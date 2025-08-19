// app/api/embed/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return new NextResponse("Missing URL parameter", { status: 400 });
    }

    // Ghi chú: Chúng ta không fetch nội dung trang ở đây.
    // Thay vào đó, chúng ta bảo trình duyệt của người dùng hãy đi đến URL đó.
    // Trình duyệt sẽ xử lý việc tải iframe một cách tự nhiên.
    // Lợi ích của proxy này là để ẩn/che giấu Referer nếu cần.

    return NextResponse.redirect(new URL(url));

  } catch (error: any) {
    console.error("❌ Lỗi Embed Proxy Redirect:", error.message);
    return new NextResponse("Failed to process embed request.", { status: 500 });
  }
}