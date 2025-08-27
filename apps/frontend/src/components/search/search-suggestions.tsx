import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import styles from '@/styles/modules/search.module.scss';

import { motion } from 'motion/react';

import Separator from '@/components/elements/separator';
import FadeImageOnLoad from '@/components/fade-image-on-load';
import type { State } from '@/context/state-context';
import type { MediaType } from '@/lib/types';
import { getTitlePath } from '@/utils/url';

function Suggestions({
  searchSuggestions,
}: {
  searchSuggestions: State['searchSuggestions'];
}) {
  const mainContainerRef = useRef(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [height, setHeight] = useState(0);

  const maxHeight = innerHeight / 3;

  useEffect(() => {
    if (maxHeight) {
      setHeight(
        Math.round(
          Math.min(containerRef.current?.offsetHeight ?? 0, maxHeight),
        ) || 0,
      );
    }
  }, [searchSuggestions, maxHeight]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { ease: 'easeOut', delay: 0.2, duration: 0.3 },
      }}
      exit={{
        opacity: 0,
        height: 0,
      }}
      style={{
        height: height,
        transition: `height 0.5s ease-out`,
        cursor: 'pointer',
      }}
      ref={mainContainerRef}
      className={styles.suggestionContainer}
    >
      <div className={styles.searchSuggestionWrapper}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
          ref={containerRef}
        >
          {searchSuggestions &&
            searchSuggestions.map((suggestion) => {
              return (
                <Link
                  key={suggestion.id}
                  href={getTitlePath(
                    suggestion.id,
                    suggestion.media_type as MediaType,
                  )}
                >
                  <motion.div
                    layout
                    transition={{ type: 'ease', duration: 0.5 }}
                    className={styles.suggestionResultContainer}
                  >
                    {suggestion.poster_path && (
                      <FadeImageOnLoad
                        imageSrc={suggestion.poster_path}
                        ambientMode
                        blur={24}
                        brightness={2}
                        scale={2}
                        ambientOptions={{
                          top: 0,
                          left: 0,
                        }}
                        imageContainer={{
                          className: styles.suggestionImageContainer,
                        }}
                        image={{ height: 80, width: 60 }}
                      />
                    )}
                    <div className={styles.suggestionInfoContainer}>
                      <h4>
                        {suggestion.title ||
                          suggestion.name ||
                          suggestion.original_title ||
                          suggestion.original_name}
                      </h4>
                      <Separator
                        gap={4}
                        values={[
                          suggestion.media_type,
                          (suggestion.first_air_date ||
                            suggestion.release_date) &&
                            new Date(
                              suggestion.first_air_date ||
                                suggestion.release_date ||
                                '',
                            ).getFullYear(),
                        ]}
                      />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
        </div>
      </div>
    </motion.div>
  );
}

export default Suggestions;
