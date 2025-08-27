export type MediaType = 'movie' | 'tv';

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type User = {
  id: string;
  name: string;
  email: string;
  role: (typeof USER_ROLES)[keyof typeof USER_ROLES];
  creationDate: Date;
};
