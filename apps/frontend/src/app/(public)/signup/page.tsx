'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import styles from '@/styles/modules/auth.module.scss';

import type { FormEvent } from 'react';

import { PATHS } from '@/constants/paths';
import { useAuth } from '@/context/auth-provider';
import { Info } from '@mui/icons-material';

export const dynamic = 'force-static';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (confirmPassword !== password) {
      setError("Passwords don't match!");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL}/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, password }),
        },
      );

      if (res.ok) {
        router.push(PATHS.SIGN_IN);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
      console.error(err);
    }
  };

  return (
    <div className={styles.container}>
      <form
        className={styles.box}
        onSubmit={handleSubmit}
      >
        <h1>Sign Up</h1>
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
          <label htmlFor="name">Name:</label>
          <input
            id="name"
            type="text"
            placeholder="John Doe"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            placeholder="john@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="pass">Password:</label>
          <input
            id="pass"
            type="password"
            value={password}
            required
            placeholder="****"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ConPass">Confirm Password:</label>
          <input
            id="ConPass"
            type="password"
            value={confirmPassword}
            required
            placeholder="****"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <input
          className={styles.submitButton}
          type="submit"
          value="Sign Up"
        />
      </form>
    </div>
  );
}
