'use client';

import { useState } from 'react';
import Link from 'next/link';

import styles from '@/styles/modules/nav.module.scss';

import { AnimatePresence, motion } from 'motion/react';

import Search from '@/components/search';
import { PATHS } from '@/constants/paths';
import { useAuth } from '@/context/auth-provider';
import { Logout } from '@mui/icons-material';
import Avatar from '@mui/joy/Avatar';

type NavProps = {
  searchInitialValue: string;
  signedIn: boolean;
};

export function Nav({ searchInitialValue }: NavProps) {
  const [open, setOpen] = useState(false);

  const session = useAuth();

  const user = session?.user;

  console.log('user', user);

  return (
    <div className={styles.navContainer}>
      <div className={styles.navRightContainer}></div>
      <Search initialValue={searchInitialValue} />
      <div className={styles.navLeftContainer}>
        {user ?
          <>
            <button
              onBlur={() => {
                setOpen(false);
              }}
              onClick={() => setOpen((prev) => !prev)}
            >
              {/*@ts-ignore*/}
              <Avatar variant="null" />
            </button>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className={styles.userModalContainer}
                >
                  {user && (
                    <div className={styles.userInfo}>
                      <h6>{user.name}</h6>
                      <span>{user.email}</span>
                    </div>
                  )}
                  <div className={styles.buttonsContainer}>
                    {user.role === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          session.logout();
                        }}
                      >
                        <span>Admin</span>
                        <Logout />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        session.logout();
                      }}
                    >
                      <span>Sign Out</span>
                      <Logout />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        : <Link
            className={styles.normalButton}
            href={PATHS.SIGN_IN}
          >
            Sign In
          </Link>
        }
      </div>
    </div>
  );
}
