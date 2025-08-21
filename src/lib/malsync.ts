// src/lib/malsync.ts
import axios from 'axios';

// Đưa hàm fetchAniZipMalId vào đây để class có thể sử dụng
async function fetchAniZipMalId(anilistId: number): Promise<string | null> {
  try {
    const { data } = await axios.get(`https://api.ani.zip/mappings?anilist_id=${anilistId}`);
    return data?.mappings?.mal_id?.toString() || null;
  } catch (error) {
    console.error(`Error fetching AniZip mappings for Anilist ID ${anilistId}:`, error);
    return null;
  }
}

export class MalSync {
    static async getProviderId(id: number, provider: string) {
        const baseUrl = process.env.MALSYNC_URI;
        if (!baseUrl) {
            throw new Error('MALSYNC_URI environment variable is not set.');
        }

        try {
            // Thử gọi trực tiếp, giả sử id có thể là MAL ID
            const response = await axios.get(`${baseUrl}${id}`);
            
            const keys = Object.keys(response.data.Sites[provider]);
            const providerId = keys.shift();
            if (!providerId) throw new Error(`Missing key for provider ${provider} in MalSync for ID: ${id}`);
            
            return providerId;
        } catch (error) {
            // Nếu lỗi, giả định id là Anilist ID và thực hiện fallback
            console.log(`MalSync failed for ID ${id}, attempting AniZip fallback...`);
            const malId = await fetchAniZipMalId(id);

            if (malId) {
                console.log(`Retrying MalSync with MAL ID ${malId}`);
                // Gọi lại với MAL ID đã được chuyển đổi
                const response = await axios.get(`${baseUrl}${malId}`);
                
                const keys = Object.keys(response.data.Sites[provider]);
                const providerId = keys.shift();
                if (!providerId) throw new Error(`Missing key for provider ${provider} in MalSync for MAL ID: ${malId}`);
                
                return providerId;
            } else {
                // Nếu fallback cũng thất bại, ném ra lỗi cuối cùng
                throw new Error(`Failed to get MalSync data for Anilist ID ${id} after fallback.`);
            }
        }
    }
}