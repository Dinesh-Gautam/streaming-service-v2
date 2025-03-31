'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import styles from '@/styles/modules/auth.module.scss';

import { Info } from '@mui/icons-material';

import { PATHS } from '@/constants/paths';

export const dynamic = 'force-static';

export default function SignInPage() {
  const session = useSession();

  const [userInfo, setUserInfo] = useState({ email: '', password: '' });

  const [error, setError] = useState<string | null>(null);

  const searchParama = useSearchParams();

  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    // validate your userinfo
    e.preventDefault();

    const res = await signIn('credentials', {
      email: userInfo.email,
      password: userInfo.password,
      redirect: false,
    });

    console.log(res);

    if (res && res.ok) {
      router.replace(searchParama.get('callbackUrl') || PATHS.HOME);
    } else {
      setError((res && res.error) || 'some error occurred');
    }
  };

  return (
    <div className={styles.container}>
      <form
        className={styles.box}
        onSubmit={handleSubmit}
      >
        {session.status === 'authenticated' ?
          <h1>You are Logged in</h1>
        : session.status === 'loading' ?
          <h1>Loading...</h1>
        : <>
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
                // type="email"
                type="text"
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
          </>
        }
      </form>

      <div className={styles.box}>
        Don&apos;t have an account <Link href={PATHS.SIGN_UP}>Sign Up.</Link>
      </div>
    </div>
  );
}
