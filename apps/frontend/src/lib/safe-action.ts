import 'server-only';

import { cookies } from 'next/headers';

import type { User } from '@/lib/types';

import { TokenService } from '@monorepo/token';

type Action<T extends any[], U> = (...args: T) => Promise<U>;

type AuthenticatedAction<T extends any[], U> = (
  user: User,
  accessToken: string,
) => Action<T, U>;

export const authenticate = <T extends any[], U>(
  action: AuthenticatedAction<T, U | null>,
): Action<T, U | null> => {
  return async function (...args: T): Promise<U | null> {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      console.error('Authentication token not found.');
      return null;
    }

    try {
      const tokenService = new TokenService();
      const user = tokenService.verifyToken<User>(accessToken);
      if (!user) {
        console.error('Invalid or expired token.');
        return null;
      }
      const innerAction = action(user, accessToken);
      return await innerAction(...args);
    } catch (error) {
      console.error(
        'Authentication failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return null;
    }
  };
};

export const authorize = <T extends any[], U>(
  action: AuthenticatedAction<T, U>,
  allowedRoles: User['role'][],
): Action<T, U | null> => {
  const authorizedAction: AuthenticatedAction<T, U | null> = (
    user,
    accessToken,
  ) => {
    if (!allowedRoles.includes(user.role)) {
      console.error('User is not authorized to perform this action.');
      return async (..._args: T) => null;
    }
    return action(user, accessToken);
  };

  return authenticate(authorizedAction);
};
