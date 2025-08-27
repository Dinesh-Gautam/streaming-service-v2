'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import styles from '@/styles/modules/auth.module.scss';

import { Info } from '@mui/icons-material';

import { signUpUser } from '@/app/(public)/signup/_action';
import { PATHS } from '@/constants/paths';

export const dynamic = 'force-static';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // clearn previous error
    setError('');

    if (confirmPassword !== password) {
      setError("Passwords don't match!");
      return;
    }

    const res = await signUpUser({ email, password, name });

    if (res.success) {
      return router.push(PATHS.SIGN_IN);
    }

    setError(res.message || 'some error occurred');
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
