/*
  This file contains all the paths that are used in the application.
  It is a good practice to keep all the paths in a single file to avoid any confusion.
*/

export const PATHS = {
  /**
   * Home page path
   */
  HOME: '/',
  /**
   * Title page path, must provide the `id` query param.
   * @example /title?id=12345
   */
  TITLE: '/title',
  /**
   * Sign in page path
   */
  SIGN_IN: '/signin',
  /**
   * Sign up page path
   */
  SIGN_UP: '/signup',

  ADMIN: {
    /**
     * Admin panel path
     */
    ROOT: '/admin',
    /**
     * Admin users page path
     * Admin edit user page path, must provide the `id` query param.
     * @example /admin/users/12345
     */
    USERS: '/admin/users',
    /**
     * Admin movies page path
     * Admin edit movie page path, must provide the `id` query param.
     * @example /admin/movies/12345
     */
    MOVIES: '/admin/movies',
    /**
     * Admin new movie page path
     */
    NEW_MOVIE: '/admin/movies/new',
    /**
     * Admin new user path
     */
    NEW_USER: '/admin/users/new',
  },
  /**
   * Playback page path, must provide the `movie Id` query param.
   * @example /playback/12345
   */
  PLAYBACK: '/play',
};
