export const SITE_URL = 'https://university.maxxedout.com';
export const SITE_HOST = 'university.maxxedout.com';
export const CONNECT_URL = 'https://connect.maxxedout.com';
export const CONNECT_HOST = 'connect.maxxedout.com';
export const TODD_SITE_URL = 'https://toddpultz.com';

export const SOCIALS = {
  instagram: 'https://www.instagram.com/toddpultzofficial/',
  facebook: 'https://www.facebook.com/todd.pultz',
  youtube: 'https://www.youtube.com/@toddpultzofficial',
  tiktok: 'https://www.tiktok.com/@toddpultzofficial',
} as const;

export const TODD_SAME_AS = [SOCIALS.instagram, SOCIALS.facebook, SOCIALS.youtube, SOCIALS.tiktok];

/** Only production is indexable. Preview/dev deploys share the prod DB and would serve identical content. */
export function isIndexableEnv(): boolean {
  return process.env.VERCEL_ENV === 'production';
}
