export type MediaType = 'movie' | 'tv';

// todo: move to a separate package

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type User = {
  id: string;
  name: string;
  email: string;
  role: (typeof USER_ROLES)[keyof typeof USER_ROLES];
  createdAt: Date;
};
