export function getSignedStreamUrl(videoId: string): string {
  return `https://iframe.cloudflarestream.com/${videoId}`;
}

export function parseStreamId(videoUrl: string): string | null {
  if (videoUrl.startsWith('stream:')) return videoUrl.slice(7);
  return null;
}

export function isStreamVideo(videoUrl: string | null): boolean {
  return !!videoUrl && videoUrl.startsWith('stream:');
}
