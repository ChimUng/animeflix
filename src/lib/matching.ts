export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  const normalize = (str: string) => str.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').toLowerCase();

  const n1 = normalize(s1);
  const n2 = normalize(s2);

  if (n1 === n2) return 0.95;
  if (n1.includes(n2) || n2.includes(n1)) return 0.85;

  const matrix: number[][] = [];
  const len1 = n1.length;
  const len2 = n2.length;

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = n1[i - 1] === n2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen;
}

/**
 * Bỏ (2011), dấu ngoặc/colon... để search engine của các domain thô match tốt hơn.
 * VD: "Hunter x Hunter (2011)" -> "Hunter x Hunter 2011"
 */
export function cleanTitleForSearch(title: string): string {
  return title
    .replace(/\(/g, ' ')
    .replace(/\)/g, ' ')
    .replace(/:/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Trả về danh sách title unique để thử lần lượt khi search, ưu tiên title gốc trước,
 * sau đó bản đã clean, sau đó romaji nếu có và khác 2 cái trên.
 */
export function buildTitleCandidates(title: string, titleRomaji?: string): string[] {
  const candidates = [title, cleanTitleForSearch(title)];
  if (titleRomaji?.trim()) candidates.push(titleRomaji.trim());
  return [...new Set(candidates.filter(Boolean))];
}

/**
 * Chọn kết quả tốt nhất từ danh sách search result theo scoreFn, log top 3 để debug,
 * chỉ chấp nhận nếu score cao nhất > threshold.
 */
export function findBestMatch<T>(
  results: T[],
  scoreFn: (item: T) => number,
  threshold: number,
  label: string
): T | null {
  if (!results || results.length === 0) return null;

  const scored = results
    .map((result) => ({ result, score: scoreFn(result) }))
    .sort((a, b) => b.score - a.score);

  console.log(`🔍 [${label}] Top matches:`);
  scored.slice(0, 3).forEach((item, idx) => {
    console.log(`  ${idx + 1}. score: ${(item.score * 100).toFixed(1)}%`);
  });

  if (scored[0].score > threshold) {
    console.log(`✅ [${label}] Best match score: ${(scored[0].score * 100).toFixed(1)}%`);
    return scored[0].result;
  }

  console.warn(`⚠️ [${label}] No good match (best: ${(scored[0].score * 100).toFixed(1)}%, threshold: ${threshold * 100}%)`);
  return null;
}