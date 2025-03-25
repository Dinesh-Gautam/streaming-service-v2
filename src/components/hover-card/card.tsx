'use client';

import Image from 'next/image';
import Link from 'next/link';

import styles from '@/styles/modules/slider.module.scss';

import { StarRounded } from '@mui/icons-material';
import { AnimatePresence, motion } from 'motion/react';

import Separator from '@/components/elements/separator';
import type { hoverCardContext } from '@/components/hover-card/types';
import {
  YoutubeControlButtons,
  YoutubeVideoPlayer,
} from '@/components/youtube';
import { getImageUrl } from '@/utils/tmdb';

export const HoverCard = ({ context }: { context: hoverCardContext }) => {
  const {
    hoverCardPosition,
    hoverCardActive,
    timeOutRef,
    animating,
    setAnimating,
    clearHover,
    getHoverCardMovie,
  } = context;

  return (
    <AnimatePresence>
      {hoverCardActive && (
        <motion.div
          style={{
            left: hoverCardPosition.x,
            top: hoverCardPosition.y,
            minHeight: hoverCardPosition.height,
            width: hoverCardPosition.width,
          }}
          onHoverEnd={(e) => {
            if (!timeOutRef.current) return;
            clearHover();
          }}
          initial={{
            transform: 'perspective(200px) translate3d(0%, 0%, 0px)',
          }}
          animate={{
            transform: `perspective(200px) translate3d(${
              100 > hoverCardPosition.x ? '10'
              : (
                hoverCardPosition.x >
                innerWidth - (hoverCardPosition.width ?? 0) - 100
              ) ?
                -10
              : '0'
            }% , -20%, 50px)`,
            // duration: 1,
            type: 'ease',
          }}
          exit={{ transform: 'perspective(200px) translate3d(0%, 0%, 0px)' }}
          transition={{
            type: 'ease',
            ease: 'easeInOut',
          }}
          onAnimationComplete={() => {
            setAnimating(false);
          }}
          className={styles.hoverCard}
        >
          <motion.div className={styles.hoverCardWrapper}>
            <Link
              href={
                '/title?id=' +
                getHoverCardMovie()?.id +
                '&type=' +
                (getHoverCardMovie()?.media_type || 'movie') +
                '&t=hover' +
                '&original=' +
                (hoverCardPosition?.original === 'true' ? 'true' : 'false')
              }
            >
              <motion.div
                layoutId={'hover'}
                style={{
                  minHeight: hoverCardPosition.height,
                  width: hoverCardPosition.width,
                }}
                className={styles.imageContainer}
              >
                {!hoverCardPosition.original && !animating && (
                  <YoutubeVideoPlayer />
                )}
                <Image
                  src={
                    hoverCardPosition.original ?
                      '/api/static' + getHoverCardMovie()?.backdrop_path || ''
                    : getImageUrl(getHoverCardMovie()?.backdrop_path || '')
                  }
                  style={{
                    position: 'relative',
                    zIndex: 100,
                  }}
                  alt={'img'}
                  objectFit={'cover'}
                  height={400 / 2}
                  width={400}
                />
              </motion.div>
            </Link>
            <motion.div className={styles.hoverCardInfo}>
              <motion.div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h1
                    style={{
                      width: '60%',
                    }}
                  >
                    {getHoverCardMovie()?.title || getHoverCardMovie().name}
                  </h1>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{
                      opacity: 0,
                    }}
                  >
                    {!hoverCardPosition.original && <YoutubeControlButtons />}
                  </motion.div>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 2,
                    }}
                  >
                    {hoverCardPosition.original ?
                      <Separator
                        values={[
                          new Date(
                            getHoverCardMovie()?.first_air_date ??
                              getHoverCardMovie()?.release_date ??
                              '',
                          ).getFullYear(),
                        ]}
                      />
                    : <>
                        <StarRounded
                          color="warning"
                          fontSize="small"
                        />
                        <Separator
                          values={[
                            `${
                              getHoverCardMovie()?.vote_average.toFixed(1) ||
                              null
                            }(${
                              getHoverCardMovie()?.vote_count.toLocaleString() ||
                              null
                            })`,
                            new Date(
                              getHoverCardMovie()?.release_date ?? '',
                            ).getFullYear(),
                            new Date(
                              getHoverCardMovie()?.first_air_date ?? '',
                            ).getFullYear(),
                            getHoverCardMovie()?.original_language,
                          ]}
                        />
                      </>
                    }
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
              }}
            >
              <Image
                src={
                  hoverCardPosition.original ?
                    '/api/static' + getHoverCardMovie()?.backdrop_path || ''
                  : getImageUrl(getHoverCardMovie()?.backdrop_path || '')
                }
                className={styles.backgroundImage}
                alt={'img'}
                height={400 / 2}
                width={400}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
