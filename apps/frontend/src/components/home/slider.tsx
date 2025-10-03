'use client';

import React, { useEffect, useRef, useState } from 'react';

import styles from '@/styles/modules/slider.module.scss';

import classNames from 'classnames';
import { AnimatePresence, easeIn, motion } from 'motion/react';
import { flushSync } from 'react-dom';

import type { OriginalMovieResult } from '@/server/db/movies';
import type { TransitionEvent } from 'react';
import type {
  MoviesGetPopularResult,
  TrendingGetTrendingResult,
} from 'tmdb-js-web';

import FadeImageOnLoad from '@/components/fade-image-on-load';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface SliderProps {
  /**
   * add title at top left of the slider if provided
   */
  title?: string;
  /**
   * List of data to display in the slider
   */
  data: (
    | MoviesGetPopularResult
    | TrendingGetTrendingResult
    | OriginalMovieResult
  )[];

  id: string;
}

function Slider({ title, data, id }: SliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /*
  no of items to display in the slider
  this value will be updated based on the screen size
  */
  const [MAX_ITEMS, SET_MAX_ITEMS] = useState(5);

  /*
  the value of the transform percent for the slider
  this value represents the current scroll of the slider
  */
  const [transformPercent, setTransformPercent] = useState(0);

  /*
  whether the slider is scrolling or not
  */
  const [disable, setDisable] = useState(false);

  /**
   * if the data length is greater than the max items
   * then show the arrows
   * otherwise hide the arrows
   */
  const showArrows = data.length > MAX_ITEMS;
  const minSlider = data.length < MAX_ITEMS * 4;
  /**
   * Handle the button (next/prev) click event
   * @param type - type of button clicked
   */
  function buttonClick(type: 'next' | 'prev') {
    setDisable(true);

    // update the scroll/transform-x value based on the button clicked
    // if next button clicedk move increse the transform value
    // otherwise, decrease the transform value for prev button click
    setTransformPercent(
      type === 'next' ? transformPercent - 100 : transformPercent + 100,
    );
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const handler = () => {
      if (!containerRef.current) return;

      const styles = getComputedStyle(containerRef.current);

      // get the value of `--max-items` from the css
      // this value is set in the css based on the screen size
      const maxItems = parseInt(styles.getPropertyValue('--max-items'));
      SET_MAX_ITEMS(maxItems);
    };

    // initial call, to set the value of `MAX_ITEMS`
    handler();

    window.addEventListener('resize', handler);

    return () => window.removeEventListener('resize', handler);
  }, [containerRef.current]);

  return (
    data && (
      <div className={styles.sliderContainer}>
        {title && <h2>{title}</h2>}
        {data && (
          <div
            ref={containerRef}
            className={styles.container}
          >
            <div
              onTransitionEnd={(e: TransitionEvent<HTMLDivElement>) => {
                (e.target as any).style.transition = 'none';

                if (transformPercent === -100 && !minSlider) {
                  setTransformPercent(-4000 - 100);
                }

                setTimeout(() => {
                  (e.target as any).style.transition = 'all 1s ease-in-out';
                  disable && setDisable(false);
                }, 100);
              }}
              style={{
                willChange: 'transform',
                transition: 'all 1s ease-in-out',
                transform: `translateX(${transformPercent}%)`,
              }}
              className={styles.wrapper}
            >
              <div className={classNames(styles.item, styles.hidden)} />
              {data.map((e, index) => {
                /*
                Calculate the value of `i` for infinite scrolling
                based on the "transformPercent" value
                */
                const baseIncrement = index === 0 ? 0 : 100;

                const additionalIncrement =
                  index >= 9 ?
                    (index + 1) % MAX_ITEMS === 0 || index % MAX_ITEMS === 0 ?
                      50 +
                      100 * Math.floor((index - (MAX_ITEMS + 1)) / MAX_ITEMS)
                    : 100 * Math.floor((index - (MAX_ITEMS + 1)) / MAX_ITEMS)
                  : 0;

                const increment = baseIncrement + additionalIncrement;

                const roundedTransformPercent = Math.round(
                  Math.abs(transformPercent + increment) /
                    100 /
                    (data.length / MAX_ITEMS),
                );

                const styleValue =
                  minSlider ? index : (
                    data.length * roundedTransformPercent + index
                  );

                return (
                  <div
                    style={{ '--i': styleValue } as React.CSSProperties}
                    className={styles.item}
                    key={index}
                  >
                    {'isOriginal' in e ?
                      <FadeImageOnLoad
                        loadingBackground
                        rawImageSrc={e.backdrop_path}
                        imageContainer={{
                          className: styles.imageContainer,
                          id: 'imageContainer',
                          'data-index': data.indexOf(e),
                          'data-type': id,
                          'data-middle': true,
                          'data-original': true,
                        }}
                        image={{
                          priority: index < MAX_ITEMS,
                          height: 400 / 2,
                          width: 400,
                        }}
                      />
                    : <FadeImageOnLoad
                        loadingBackground
                        imageSrc={e.backdrop_path}
                        imageContainer={{
                          className: styles.imageContainer,
                          id: 'imageContainer',
                          'data-index': data.indexOf(e),
                          'data-type': id,
                          'data-middle': true,
                        }}
                        image={{
                          priority: index < MAX_ITEMS,
                          height: 400 / 2,
                          width: 400,
                        }}
                      />
                    }
                    <h1 className={styles.movieName}>
                      {e.title || ('original_title' in e && e.original_title)}
                    </h1>
                  </div>
                );
              })}
            </div>
            {showArrows && (
              <>
                <AnimatePresence>
                  {Math.abs(transformPercent) > 0 && (
                    <motion.button
                      initial={{ x: '-100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '-100%' }}
                      transition={{ ease: 'easeOut' }}
                      disabled={disable}
                      className={styles.leftButton + ' ' + styles.btn}
                      onClick={() => buttonClick('prev')}
                    >
                      <ArrowForwardIosIcon
                        style={{ transform: 'rotate(-180deg)' }}
                      />
                    </motion.button>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {(!minSlider ||
                    (!disable &&
                      transformPercent >
                        -100 * (data.length / MAX_ITEMS - 1))) && (
                    <motion.button
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      transition={{ ease: 'easeOut' }}
                      disabled={disable}
                      className={styles.rightButton + ' ' + styles.btn}
                      onClick={() => buttonClick('next')}
                    >
                      <ArrowForwardIosIcon />
                    </motion.button>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        )}
      </div>
    )
  );
}

export default Slider;
