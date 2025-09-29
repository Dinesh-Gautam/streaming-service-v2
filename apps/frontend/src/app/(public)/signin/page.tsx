'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import styles from '@/styles/modules/auth.module.scss';

import type { FormEvent } from 'react';

import { loginAction } from '@/actions/auth/actions';
import { PATHS } from '@/constants/paths';
import { useAuth } from '@/context/auth-provider';
import { Info } from '@mui/icons-material';

export const dynamic = 'force-static';

export default function SignInPage() {
  return (
    <div className={styles.container}>
      <Suspense>
        <SignInForm />
      </Suspense>
      <div className={styles.box}>
        {"Don't have an account"} <Link href={PATHS.SIGN_UP}>Sign Up.</Link>
      </div>
    </div>
  );
}

function SignInForm() {
  const [userInfo, setUserInfo] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await loginAction(userInfo);

      if (result.accessToken) {
        login(result.accessToken);
        router.replace(searchParams.get('callbackUrl') || PATHS.HOME);
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
      console.error(err);
    }
  };

  return (
    <form
      className={styles.box}
      onSubmit={handleSubmit}
    >
      <h1>Login</h1>
      {error && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Info color="error" />
          <span>{error}</span>
        </div>
      )}
      <div>
        <div>
          <label htmlFor="email">Email</label>
        </div>
        <input
          value={userInfo.email}
          id="email"
          onChange={({ target }) =>
            setUserInfo({ ...userInfo, email: target.value })
          }
          type="email"
          placeholder="john@email.com"
          required
        />
      </div>
      <div>
        <label htmlFor="pass">Password</label>
        <input
          id="pass"
          value={userInfo.password}
          onChange={({ target }) =>
            setUserInfo({ ...userInfo, password: target.value })
          }
          type="password"
          placeholder="********"
          required
        />
      </div>
      <input
        className={styles.submitButton}
        type="submit"
        value="Login"
      />
    </form>
  );
}
