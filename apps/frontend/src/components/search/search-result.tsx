'use client';

import Link from 'next/link';

import styles from '@/styles/modules/search-result.module.scss';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { motion } from 'motion/react';

import type { SearchResultDetailPageProps } from '@/app/(public)/search/[query]/page';
import Separator from '@/components/elements/separator';
import FadeImageOnLoad from '@/components/fade-image-on-load';
import type { MediaType } from '@/lib/types';
import { getTitlePath } from '@/utils/url';

const arrowVariant = {
  rest: {
    x: -50,
    opacity: 0,
  },
  hover: {
    x: 0,
    opacity: 0.8,
    transition: {
      type: 'ease',
      ease: 'easeOut',
      duration: 0.5,
    },
  },
};

export function SearchResult({
  results,
}: {
  results: SearchResultDetailPageProps['result'];
}) {
  return (
    <div className={styles.container}>
      {results.map((item) => (
        <Results
          item={item}
          key={item.id}
        />
      ))}
    </div>
  );
}

// function Results({
//   item,
// }: {
//   item: SearchResultDetailPageProps['result'][number];
// }) {
//   return item.name;
// }
function Results({
  item,
}: {
  item: SearchResultDetailPageProps['result'][number];
}) {
  return (
    <Link href={getTitlePath(item.id, item.media_type as MediaType)}>
      <motion.div style={{ cursor: 'pointer' }}>
        <motion.div
          initial="rest"
          animate="rest"
          whileHover="hover"
          className={styles.itemContainer}
          key={item.id}
        >
          <div>
            <motion.div className={styles.item}>
              {item.poster_path && (
                <FadeImageOnLoad
                  imageSrc={item.poster_path}
                  imageContainer={{ className: styles.imageContainer }}
                  image={{
                    height: 208,
                    width: 148,
                  }}
                />
              )}
              <div className={styles.infoContainer}>
                <div className={styles.header}>
                  <motion.h1>
                    {item.title ||
                      item.name ||
                      item.original_title ||
                      item.original_name}
                  </motion.h1>
                  <Separator
                    gap={4}
                    values={[
                      item.media_type,
                      item.genre_ids &&
                        item.genre_ids.map((gen) => gen?.name).join(', '),
                      new Date(item.first_air_date ?? '').getFullYear(),
                    ]}
                  />
                </div>
                <div className={styles.description}>
                  <p>{item.overview}</p>
                </div>
              </div>
              <motion.div
                className={styles.arrowRight}
                variants={arrowVariant}
              >
                <ArrowForwardIcon fontSize="large" />
              </motion.div>
            </motion.div>
            {item.poster_path && (
              <FadeImageOnLoad
                loadingBackground={false}
                imageSrc={item.poster_path}
                imageContainer={{ className: styles.backgroundImg }}
                image={{
                  height: 208,
                  width: 548,
                }}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </Link>
  );
}
