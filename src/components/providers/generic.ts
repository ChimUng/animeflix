import { redis } from '@/lib/rediscache';
import { MalSync } from '@/lib/malsync';

export type ProviderName = 'Gogoanime' | 'default' | '9anime' | 'zoro' | 'animepahe';

export type ProviderEpisode = {
	id: string;
	number: number;
	title?: string;
	length?: number;
	 snapshot?: string; // URL hình ảnh tập từ AnimePahe
	filler?: number; // 0 hoặc 1, để xác định tập filler
	audio?: string; // "jpn" hoặc "eng", để xác định sub/dub
};

abstract class Provider {
	public identifier: ProviderName = 'default';
	public malSyncId = '';
	public malId: number;

	constructor(malId: number) {
		this.malId = malId;
	}

	async getProviderId() {
		if (this.identifier === 'default') throw new Error('Default provider has been called.');
		const id = await MalSync.getProviderId(this.malId, this.malSyncId);
		return id;
	}

	async getId() {
		const cacheKey = `provider:${this.malId}:${this.identifier}`;

		if (redis) {
			const cachedId = await redis.get(cacheKey);
			if (cachedId) return cachedId;
		}

		const id = await this.getProviderId();

		if (redis) {
			await redis.set(cacheKey, id, 'EX', 60 * 60 * 24 * 7); // TTL 7 ngày
		}

		return id;
	}

	abstract getEpisodes(page: number): Promise<ProviderEpisode[]>;

	abstract getSourceInfo(
		episodeId: string,
		getLength?: boolean
	): Promise<{ url: string; length: number }>;
}

export default Provider;
