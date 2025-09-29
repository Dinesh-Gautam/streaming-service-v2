'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function loginAction(credentials: any) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL}/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return { error: data.message };
  }

  const cookieStore = await cookies();
  const refreshTokenCookie = response.headers.get('set-cookie');
  if (refreshTokenCookie) {
    cookieStore.set(
      'refreshToken',
      refreshTokenCookie.split(';')[0].split('=')[1],
    );
  }

  return { accessToken: data.accessToken };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken');

  if (refreshToken) {
    await fetch(`${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL}/logout`, {
      headers: {
        Cookie: `refreshToken=${refreshToken.value}`,
      },
    });
    cookieStore.delete('refreshToken');
  }
  revalidatePath('/');
}

export async function refreshTokenAction() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken');

  if (!refreshToken) {
    return { error: 'Refresh token not found' };
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL}/refresh-token`,
    {
      headers: {
        Cookie: `refreshToken=${refreshToken.value}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return { error: data.message };
  }

  const newRefreshTokenCookie = response.headers.get('set-cookie');
  if (newRefreshTokenCookie) {
    cookieStore.set(
      'refreshToken',
      newRefreshTokenCookie.split(';')[0].split('=')[1],
    );
  }

  return { accessToken: data.accessToken };
}
