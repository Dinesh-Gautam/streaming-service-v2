'use client';

import { useState } from 'react';
import Link from 'next/link';

import styles from '@/styles/modules/banner.module.scss';

import classNames from 'classnames';
import { AnimatePresence } from 'motion/react';

import { MoviesGetPopularResult } from 'tmdb-js-web';

import FadeImageOnLoad from '@/components/fade-image-on-load';
import FadeInOnMount from '@/components/fade-on-load';
import {
  YoutubeControlButtons,
  YoutubeVideoPlayer,
  YoutubeVideoPlayerProvider,
} from '@/components/youtube';
import { MediaType } from '@/lib/types';
import { Logger } from '@/utils/logger';
import { getTitlePathForBanner } from '@/utils/url';

/**
 * Banner `next/prev` button types
 */
type ButtonTypes = 'next' | 'prev';

type PopularMoviesProps = {
  /**
   * Type of media to display, either 'movie' or 'tv'
   */
  media_type?: MediaType;
  /**
   * List of popular movies to display
   */
  popularMovies: MoviesGetPopularResult[];
};

const logger = new Logger('Popular_movies_banner');

const PopularMoviesBanner = ({
  media_type = 'movie',
  popularMovies,
}: PopularMoviesProps) => {
  /*
   the current index of the banner,
   the main banner will be displayed based on this index
  */
  const [currentIndex, setCurrentIndex] = useState(1);

  // previous and next ndex based on current index
  const prevIndex =
    currentIndex < 1 ? popularMovies.length - 1 : currentIndex - 1;
  const nextIndex =
    currentIndex >= popularMovies.length - 1 ? 0 : currentIndex + 1;

  /* whether the buttons(next/prev) are disabled or not */
  const [disable, setDisable] = useState(false);

  /**
   * Get the next or previous index based on the current index
   * @param prev - previous index
   * @param type - type of button clicked
   * @returns next or previous index
   */
  function getIndex(prev: number, type: ButtonTypes) {
    const index = type === 'next' ? prev + 1 : prev - 1;

    if (type === 'prev') {
      if (index < 0) {
        return popularMovies.length - 1;
      }
    } else {
      if (index > popularMovies.length - 1) {
        return 0;
      }
    }
    return index;
  }

  const handleBannerChangeClickHandler = (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const type = e.currentTarget.dataset.type as ButtonTypes;
    setDisable(true);
    setCurrentIndex((i) => getIndex(i, type));
  };

  logger.log('diableValue', disable);

  return (
    <YoutubeVideoPlayerProvider
      id={popularMovies[currentIndex].id}
      media_type={media_type}
    >
      <>
        <div className={styles.bannerContainer}>
          {popularMovies.map((movie, index) => {
            return (
              <div
                onTransitionEnd={() => setDisable(false)}
                key={movie.id}
                className={classNames(
                  styles.banner,
                  getPositionClassName(
                    index,
                    nextIndex,
                    prevIndex,
                    currentIndex,
                  ),
                )}
              >
                <Link href={getTitlePathForBanner(movie.id)}>
                  <BackgroundImage
                    id={movie.id}
                    imgSrc={popularMovies[index].backdrop_path}
                    priority={
                      index === currentIndex ||
                      index === nextIndex ||
                      index === prevIndex
                    }
                  />
                </Link>
                <AnimatePresence>
                  {!disable && currentIndex === index && (
                    <FadeInOnMount>
                      <div className={styles.bottom}>
                        <h1>{movie.title}</h1>
                        <div className={styles.videoControls}>
                          <YoutubeControlButtons />
                        </div>
                      </div>
                      {index === currentIndex && (
                        <YoutubeVideoPlayer roundedBorder />
                      )}
                    </FadeInOnMount>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <button
            data-type="prev"
            disabled={disable}
            className={styles.leftButton}
            onClick={handleBannerChangeClickHandler}
          >
            Previous
          </button>
          <button
            data-type="next"
            disabled={disable}
            className={styles.rightButton}
            onClick={handleBannerChangeClickHandler}
          >
            Next
          </button>
        </div>
      </>
    </YoutubeVideoPlayerProvider>
  );
};

function BackgroundImage({
  id,
  imgSrc,
  priority,
}: {
  id: number;
  imgSrc: string;
  priority: boolean;
}) {
  return (
    <FadeImageOnLoad
      loadingBackground
      imageSrc={imgSrc}
      ambientMode
      positionAbsolute
      opacity={0.5}
      saturation={1.4}
      brightness={2}
      blur={124}
      scale={1}
      imageContainer={{
        layoutId: 'banner' + id,
        className: styles.bannerImageContainer,
      }}
      image={{
        priority: priority,
        height: 800 / 2,
        width: 800,
      }}
    />
  );
}

/**
 * Get the position class name based on the index
 * @param index - index of the banner
 * @param nextIndex - next index
 * @param prevIndex - previous index
 * @param currentIndex - current index
 * @returns - class name based on the index
 */
function getPositionClassName(
  index: number,
  nextIndex: number,
  prevIndex: number,
  currentIndex: number,
) {
  if (index == nextIndex) return styles.right;
  else if (index === prevIndex) return styles.left;
  else if (index === currentIndex) return styles.middle;
  else if (index === nextIndex + 1 || index < prevIndex - 1)
    return styles.extremeRight;
  else if (index > nextIndex + 1 || index === prevIndex - 1)
    return styles.extremeLeft;
  else '';
}

export default PopularMoviesBanner;
