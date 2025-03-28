import { PATHS } from '@/constants/paths';

/**
 * Get the link to the title page for the banner
 * @param id - id of the media
 * @returns - path to the title page
 */
export function getTitlePathForBanner(id: number) {
  return [PATHS.TITLE, 'movie', id].join('/') + '?t=banner';
}
