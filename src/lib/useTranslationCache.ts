import { useEffect, useState, useRef } from "react";
import UseDebounce from "@/utils/UseDebounce";

interface TranslationRequest {
    anilistId: number;
    title: string;
    description: string;
    }

    export const useTranslationCache = (
    anilistId: number,
    title: string,
    description: string
    ) => {
    const [titleVI, setTitleVI] = useState<string>();
    const [descriptionVI, setDescriptionVI] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debouncedTitle = UseDebounce(title, 5000);
    const debouncedDescription = UseDebounce(description, 5000);
    const translationCache = useRef<Record<number, boolean>>({});
    const batchQueue = useRef<TranslationRequest[]>([]);
    const batchTimeout = useRef<NodeJS.Timeout | null>(null);

    const fetchTranslated = async (requests: TranslationRequest[], retryCount = 3, delay = 1000) => {
        if (!requests.length) return;

        try {
        // setLoading(true);
        // console.log(`Sending batch request for Anime IDs: ${requests.map((r) => r.anilistId).join(", ")}`);
        const res = await fetch("/api/translate", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ batch: requests }),
        });

        if (!res.ok) {
            const error = await res.json();
            if (res.status === 429 && error.error === "Gemini API quota exceeded") {
            console.error("Quota exceeded, falling back to default title/description");
            setError("Gemini API quota exceeded, using default title/description");
            requests.forEach(({ anilistId }) => {
                translationCache.current[anilistId] = true; // Đánh dấu cache để tránh thử lại
            });
            return;
            }
            if (res.status === 429 && retryCount > 0) {
            console.warn(`Rate limited (429), retrying after ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return fetchTranslated(requests, retryCount - 1, delay * 2);
            }
            console.error(`❌ API Error for batch:`, error);
            setError(error?.message || "Unknown error");
            return;
        }

        const data = await res.json();
        if (Array.isArray(data.translated)) {
            data.translated.forEach(({ anilistId, title_vi, description_vi, error }: any) => {
            if (error) {
                console.error(`Translation failed for Anime ID ${anilistId}: ${error}`);
                return;
            }
            if (anilistId === anilistId) {
                if (title_vi) setTitleVI(title_vi);
                if (description_vi) setDescriptionVI(description_vi);
            }
            translationCache.current[anilistId] = true;
            // console.log(`✅ [CLIENT CACHE HIT] Anime ID: ${anilistId}`);
            });
        }
        } catch (error: any) {
        console.error("❌ Translation fetch failed:", error);
        setError(error.message);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        if (
        anilistId &&
        debouncedTitle &&
        debouncedDescription &&
        !translationCache.current[anilistId]
        ) {
        // console.log(`Adding to batch queue: ID=${anilistId}, title=${debouncedTitle}, description=${debouncedDescription}`);
        batchQueue.current.push({ anilistId, title: debouncedTitle, description: debouncedDescription });

        // Giới hạn kích thước batch
        if (batchQueue.current.length >= 10) {
            fetchTranslated(batchQueue.current);
            batchQueue.current = [];
            batchTimeout.current = null;
        } else if (!batchTimeout.current) {
            batchTimeout.current = setTimeout(() => {
            fetchTranslated(batchQueue.current);
            batchQueue.current = [];
            batchTimeout.current = null;
            }, 5000);
        }
        }
    }, [anilistId, debouncedTitle, debouncedDescription]);

    useEffect(() => {
        return () => {
        if (batchTimeout.current) {
            clearTimeout(batchTimeout.current);
        }
        };
    }, []);

    return { titleVI, descriptionVI, loading, error };
};