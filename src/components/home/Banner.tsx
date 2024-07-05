'use client';

import { useState } from 'react';
import Link from 'next/link';

import styles from '@/styles/components/banner.module.scss';

import FadeImageOnLoad from '@/components/FadeImageOnLoad';
import FadeInOnMount from '@/components/FadeInOnMount';
import {
  YoutubeControlButtons,
  YoutubeVideoPlayer,
  YoutubeVideoPlayerProvider,
} from '@/components/youtube';
import { MediaType } from '@/lib/types';
import classNames from 'classnames';
import { AnimatePresence } from 'framer-motion';

import { MoviesGetPopularResult } from 'tmdb-js-web';

type ButtonTypes = 'next' | 'prev';

type PopularMoviesProps = {
  media_type: MediaType;
  popularMovies: MoviesGetPopularResult[];
};

const PopularMoviesBanner = ({
  media_type = 'movie',
  popularMovies,
}: PopularMoviesProps) => {
  const [currentIndex, setCurrentIndex] = useState(1);

  const prevIndex =
    currentIndex < 1 ? popularMovies.length - 1 : currentIndex - 1;
  const nextIndex =
    currentIndex >= popularMovies.length - 1 ? 0 : currentIndex + 1;

  const [disable, setDisable] = useState(false);

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

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const type = e.currentTarget.dataset.type as ButtonTypes;
    setDisable(true);
    setCurrentIndex((i) => getIndex(i, type));
  };

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
                <Link href={getLinkHref(movie.id)}>
                  <BackgroundImage
                    id={movie.id}
                    imgSrc={popularMovies[index].backdrop_path}
                  />
                </Link>
                <AnimatePresence>
                  {!disable && currentIndex === index && (
                    <FadeInOnMount>
                      <>
                        <div className={styles.bottom}>
                          <h1>{movie.title}</h1>
                          <div className={styles.videoControls}>
                            <YoutubeControlButtons />
                          </div>
                        </div>
                        {index === currentIndex && (
                          <YoutubeVideoPlayer roundedBorder />
                        )}
                      </>
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
            onClick={handleClick}
          >
            Previous
          </button>
          <button
            data-type="next"
            disabled={disable}
            className={styles.rightButton}
            onClick={handleClick}
          >
            Next
          </button>
        </div>
      </>
    </YoutubeVideoPlayerProvider>
  );
};

function BackgroundImage({ id, imgSrc }: { id: number; imgSrc: string }) {
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
        height: 400 / 2,
        width: 400,
      }}
    />
  );
}

function getLinkHref(id: number) {
  return '/title?id=' + id + '&type=' + 'movie' + '&t=banner';
}

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
