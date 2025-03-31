'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

import styles from '@/styles/modules/nav.module.scss';

import { Logout } from '@mui/icons-material';
import Avatar from '@mui/joy/Avatar';
import { AnimatePresence, motion } from 'motion/react';

import Search from '@/components/search';

type NavProps = {
  searchInitialValue: string;
  signedIn: boolean;
};

export function Nav({ searchInitialValue }: NavProps) {
  const [open, setOpen] = useState(false);

  const session = useSession();

  const user = session.data?.user as {
    name: string;
    email: string;
    role: string;
  };

  return (
    <div className={styles.navContainer}>
      <div className={styles.navRightContainer}></div>
      <Search initialValue={searchInitialValue} />
      <div className={styles.navLeftContainer}>
        {session.status === 'authenticated' ?
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
                          signOut();
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
                        signOut();
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
        : session.status === 'unauthenticated' ?
          <button
            className={styles.normalButton}
            onClick={() => signIn()}
          >
            Sign In
          </button>
        : null}
      </div>
    </div>
  );
}
