export interface AninekoSearchResult {
  title: string;
  slug: string;
  url: string;
  poster?: string | null;
  type?: string | null;
  genres?: string[];
}
 
export interface AninekoEpisodeItem {
  number: number | null;
  title: string;
  slug: string;
  url: string;
  badges: string[]; // ["SUB","DUB","HSUB"]
}
 
export interface AninekoServerItem {
  server: string;
  type: string; // "hsub" | "sub" | "dub"
  iframeUrl: string; // có thể chứa "\tsub=<vtt_url>" nối vào cuối, cần tách riêng khi parse
  domain: string;
  supported: boolean;
}
 