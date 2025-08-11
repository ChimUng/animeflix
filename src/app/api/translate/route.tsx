import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

interface TranslationRequest {
  anilistId: number;
  title: string;
  description: string;
}

export async function POST(req: Request) {
  const { batch } = await req.json();

  if (!Array.isArray(batch) || batch.length === 0) {
    return NextResponse.json({ error: "Batch dữ liệu không hợp lệ" }, { status: 400 });
  }

  const translateWithRetry = async (
    requests: TranslationRequest[],
    retryCount = 3,
    delay = 1000
  ): Promise<NextResponse> => {
    try {
      // Kiểm tra cache
      const anilistIds = requests.map((req) => req.anilistId);
      const { data: cached } = await supabase
        .from("anime_translations")
        .select("*")
        .in("anilist_id", anilistIds);

      const cachedMap = new Map(cached?.map((item) => [item.anilist_id, item]) || []);
      const emptyDescRegex = /^\(?(Chưa có|Không có|Hiện chưa có)\s*mô tả\.?\)?$/i;
      const toTranslate = requests.filter(req => {
          const cachedItem = cachedMap.get(req.anilistId);
          if (!cachedItem) {
              return true; // Dịch nếu chưa có trong cache
          }
          // Dịch lại nếu mô tả trong cache khớp với biểu thức chính quy
          return emptyDescRegex.test(cachedItem.description_vi.trim());
      });

      if (toTranslate.length === 0) {
        return NextResponse.json({ cached: true, translated: cached });
      }

      if (toTranslate.length > 10) {
        console.warn(`⚠️ Batch size too large (${toTranslate.length}), trimming to 10`);
        toTranslate.splice(10);
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Chuẩn bị prompts
      const prompts = toTranslate.map(({ title, description, anilistId }) => {
        if (!title || !description) {
          console.error(`Invalid input for Anime ID ${anilistId}: title=${title}, description=${description}`);
          return null;
        }
        const lower = (title + " " + description).toLowerCase();
        let seasonText = "";
        const seasonMatch = lower.match(/(season|mùa|s|phần)[\s\-]*(\d+)/i);
        if (seasonMatch) {
          seasonText = ` Mùa ${seasonMatch[2]}`;
        }

        return {
          anilistId,
          title,
          description,
          prompt: `
Bạn là biên tập viên vietsub chuyên nghiệp cho cộng đồng anime.
Hãy dịch tự nhiên tên và mô tả sang tiếng Việt theo định dạng sau:
- Tên: <Tên tiếng Việt hoặc Romaji - Tên tiếng Việt${seasonText}>
- Mô tả: <Mô tả dịch tự nhiên>

YÊU CẦU BẮT BUỘC:
1. Tên chỉ dùng một trong các định dạng:
   - <Romaji> - <Tên tiếng Việt>${seasonText}
   - <Tên tiếng Việt>${seasonText}
   - <Romaji>${seasonText}
2. KHÔNG chứa từ 'hoặc', ngoặc () hay giải thích phụ.
3. Nếu tên anime phổ biến tại Việt Nam, dùng tên thường dùng (VD: One Piece → Vua Hải Tặc).
4. Mô tả phải tự nhiên, dễ hiểu, không lặp từ, không máy móc.
5. Bắt buộc trả về đúng định dạng:
   Tên: <tên dịch>
   Mô tả: <mô tả dịch>

DỮ LIỆU:
Tên: ${title}
Mô tả: ${description}
`,
        };
      }).filter((item) => item !== null);

      if (prompts.length === 0) {
        console.error("No valid prompts to translate");
        return NextResponse.json({ error: "Dữ liệu đầu vào không hợp lệ" }, { status: 400 });
      }

      const results = await Promise.all(
        prompts.map(({ prompt }) => model.generateContent(prompt))
      );

      const translations = results.map((result, index) => {
        const response = result.response;
        let text = response.text();
        let title_vi = "";
        let description_vi = "";

        const titleMatch = text.match(/Tên:\s*(.+)/i);
        const descMatch = text.match(/Mô tả:\s*([\s\S]+)/i);

        if (titleMatch && descMatch) {
          title_vi = titleMatch[1].trim();
          description_vi = descMatch[1].trim();
        } else {
          console.warn(`Fallback parsing for Anime ID ${prompts[index]!.anilistId}: text=${text}`);
          const lines = text.split("\n").filter((line) => line.trim());
          title_vi = lines[0]?.trim() || (prompts[index]!.title ?? "Unknown Title");
          description_vi = lines.slice(1).join(" ").trim() || (prompts[index]!.description ?? "No description available");
        }
        
        if (title_vi && /hoặc|\(.+\)/i.test(title_vi)) {
          title_vi = title_vi.replace(/\(.+\)/g, "").replace(/hoặc.+/i, "").trim();
        }

        if (!title_vi || !description_vi) {
          console.error(`Invalid format for Anime ID ${prompts[index]!.anilistId}: text=${text}`);
          return null;
        }

        return {
          anilistId: prompts[index]!.anilistId,
          title_vi,
          description_vi,
        };
      }).filter((item) => item !== null);

      if (translations.length === 0) {
        console.error("No valid translations returned");
        return NextResponse.json({ error: "Không có bản dịch hợp lệ" }, { status: 500 });
      }

      // --- LOGIC MỚI BẮT ĐẦU TỪ ĐÂY ---
      // Lọc ra những bản dịch có mô tả hợp lệ để lưu vào DB.
      const validTranslationsToSave = translations.filter(item => {
          if (!item || !item.description_vi || item.description_vi.trim() === '' || item.description_vi === "No description available") {
              console.log(`Bỏ qua lưu trữ cho Anime ID ${item?.anilistId} do mô tả không hợp lệ.`);
              return false;
          }
          if (emptyDescRegex.test(item.description_vi.trim())) {
              console.log(`Bỏ qua lưu trữ cho Anime ID ${item.anilistId} do mô tả là placeholder.`);
              return false;
          }
          return true;
      });
      
      // Chỉ thực hiện lưu vào DB nếu có bản dịch hợp lệ
      if (validTranslationsToSave.length > 0) {
          console.log(`Đang lưu ${validTranslationsToSave.length} bản dịch hợp lệ vào DB...`);
          const { error: insertError } = await supabase.from("anime_translations").upsert(
              validTranslationsToSave.map(({ anilistId, title_vi, description_vi }) => ({
                  anilist_id: anilistId,
                  title_vi,
                  description_vi,
              })),
              { onConflict: "anilist_id" }
          );

          if (insertError) {
              console.error("Lỗi khi lưu vào Supabase:", insertError);
              return NextResponse.json({ error: "Không thể lưu bản dịch", details: insertError.message }, { status: 500 });
          }
      } else {
          console.log("Không có bản dịch mới hợp lệ nào để lưu vào database.");
      }
      // --- LOGIC MỚI KẾT THÚC Ở ĐÂY ---

      // Kết hợp bản dịch mới với cache để trả về cho client
      // Luôn trả về đầy đủ kết quả (kể cả lỗi) để client không request lại
      const responseData = requests.map((req) => {
        const translatedItem = translations.find((t) => t!.anilistId === req.anilistId);
        // Ưu tiên bản dịch mới, nếu không có thì lấy từ cache, nếu vẫn không có thì trả về lỗi
        return translatedItem || cachedMap.get(req.anilistId) || { anilistId: req.anilistId, error: "Translation failed or skipped" };
      });

      return NextResponse.json({
        cached: false,
        translated: responseData,
      });
    } catch (err: any) {
      if (err.status === 429) {
        const isQuotaError = err.errorDetails?.some((detail: any) =>
          detail["@type"]?.includes("QuotaFailure")
        );
        if (isQuotaError) {
          console.error("Gemini API quota exceeded:", err.errorDetails);
          return NextResponse.json({ error: "Gemini API quota exceeded" }, { status: 429 });
        }
        if (retryCount > 0) {
          console.warn(`⚠️ Rate limited (429), retrying after ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return translateWithRetry(requests, retryCount - 1, delay * 2);
        }
      }

      console.error("Gemini translation failed:", err);
      return NextResponse.json({ error: "Translate failed", details: err.message }, { status: 500 });
    }
  };

  return translateWithRetry(batch);
}