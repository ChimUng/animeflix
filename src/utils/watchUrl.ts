export function buildWatchUrl(params: {
    id: string | number;
    provider: string;
    epId: string;
    epNum: string | number;
    subdub: string;
}): string {
    const { id, provider, epId, epNum, subdub } = params;
    return `/anime/watch/${id}/${provider}/${encodeURIComponent(epId)}/${epNum}/${subdub}`;
}