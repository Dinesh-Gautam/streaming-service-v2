'use client';

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';

import styles from '@/styles/modules/title.module.scss';

import { ArrowLeft, ArrowRight, PlayArrowRounded } from '@mui/icons-material';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import Close from '@mui/icons-material/Close';
import Star from '@mui/icons-material/Star';
import { AnimatePresence, motion } from 'motion/react';

import Select from '@/components/elements/custom-select';
import Separator from '@/components/elements/separator';
import FadeImageOnLoad from '@/components/fade-image-on-load';
import { getSeasonInfo } from '@/components/title/_action';
import { FormatParagraph } from '@/components/utils/paragraph';
import {
  YoutubeControlButtons,
  YoutubeVideoPlayer,
} from '@/components/youtube';
import { useYoutubePlayer } from '@/components/youtube/context';
import type { MediaType } from '@/lib/types';
import type { OriginalMovieResult } from '@/server/db/movies';
import type {
  cachedGeMovietDetails,
  cachedTvDetails,
  cachedTvSeasonInfo,
} from '@/server/tmdb';
import { getImageUrl } from '@/utils/tmdb';
import { getPlaybackUrl } from '@/utils/url';

const otherElementsAnimation = {
  initial: {
    opacity: 1,
  },
  animate: {
    opacity: 0,
    pointerEvents: 'none',
  },
};

export type MediaResult<T extends MediaType> =
  T extends 'movie' ? Awaited<ReturnType<typeof cachedGeMovietDetails>>
  : Awaited<ReturnType<typeof cachedTvDetails>> & {
      seasonInfo: Awaited<ReturnType<typeof cachedTvSeasonInfo>>;
    };

export type MovieResult = MediaResult<'movie'>;
export type TvResult = MediaResult<'tv'>;

export type Result = MovieResult | TvResult | OriginalMovieResult;

type TitleViewProps = {
  media_type: MediaType;
  result: Result;
  layout_type?: string;
  original: boolean;
};

function TitleView({
  result,
  layout_type,
  media_type,
  original,
}: TitleViewProps) {
  const [animating, setAnimating] = useState(true);
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const { playerState } = useYoutubePlayer();
  const { hideAll, onMouseMove } = useHideUntilMouseInactivity();

  return (
    <motion.div
      onAnimationEnd={() => {
        setAnimating(false);
      }}
      layout
      layoutId={
        !layout_type ? ''
        : layout_type === 'hover' ?
          layout_type
        : layout_type + String(result.id)
      }
      className={styles.container}
    >
      <HideUntilMouseInactive
        hideAll={hideAll}
        style={{
          position: 'relative',
          zIndex: 100000,
          backdropFilter: playerState.playing ? 'blur(0px)' : 'blur(64px)',
        }}
        className={styles.leftContainer}
      >
        <Title result={result} />
        <HideWhenPlayerIsPlaying>
          <SeparatedInfo
            media_type={media_type}
            result={result}
          />
        </HideWhenPlayerIsPlaying>
        <HideWhenPlayerIsPlaying>
          <ClickableLessInfo
            original={original}
            result={result}
            moreInfoOpen={moreInfoOpen}
            setMoreInfoOpen={setMoreInfoOpen}
          />
        </HideWhenPlayerIsPlaying>
        <div>
          {media_type === 'tv' && (
            <TvSeasonsDrawer
              media_type={media_type}
              result={result}
            />
          )}
          <Buttons
            original={original}
            result={result}
          />
        </div>
      </HideUntilMouseInactive>

      <OpenedMoreInfo
        original={original}
        result={result}
        moreInfoOpen={moreInfoOpen}
        setMoreInfoOpen={setMoreInfoOpen}
      />

      {!animating && <Poster result={result} />}

      <Backdrop
        original={original}
        result={result}
        onMouseMove={onMouseMove}
        layout_type={layout_type}
        animating={animating}
      />
    </motion.div>
  );
}

function Title({ result }: { result: Result }) {
  const { playerState } = useYoutubePlayer();

  const title =
    'title' in result ? result.title
    : 'name' in result ? result.name
    : '';

  return (
    <motion.div>
      <motion.h1
        transition={{
          ease: 'easeInOut',
          layout: { duration: 0.3, ease: 'easeInOut' },
        }}
        animate={{
          scale: playerState.playing ? 0.5 : 1,
        }}
        style={{
          transformOrigin: 'top left',
        }}
      >
        {title}

        {/* {!result?.logo ?

        : <Image
            alt="logo"
            src={result.logo}
            width={800}
            height={800}
            style={{
              objectFit: 'contain',
              height: '100%',
              width: '60%',
            }}
          />
        } */}
      </motion.h1>
    </motion.div>
  );
}

function SeparatedInfo({
  result,
  media_type,
}: {
  result: Result;
  media_type: MediaType;
}) {
  const date =
    'release_date' in result ? result.release_date
    : 'first_air_date' in result ? result.first_air_date
    : null;

  const releaseDate = date && new Date(date).getFullYear();

  return (
    <Separator
      gap={8}
      values={[
        media_type,
        result.genres
          .map((gen, index, { length }) =>
            index + 1 == length ? gen.name + ' ' : gen.name + ', ',
          )
          .join(' '),
        releaseDate,
      ]}
    />
  );
}

type MoreInfoProps = {
  original: boolean;
  result: Result;
  moreInfoOpen: boolean;
  setMoreInfoOpen: Dispatch<SetStateAction<boolean>>;
};

function ClickableLessInfo({
  original,
  result,
  moreInfoOpen,
  setMoreInfoOpen,
}: MoreInfoProps) {
  return (
    !moreInfoOpen && (
      <motion.div
        layout
        layoutId="moreInfoLayout"
        onClick={() => !original && setMoreInfoOpen(true)}
        className={styles.moreInfoContainer}
      >
        {!original && (
          <div style={{ flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Star color="warning" />
              <Separator
                gap={8}
                values={[
                  `${result.vote_average?.toFixed(1) || null} (${
                    result?.vote_count?.toLocaleString() || null
                  })`,
                  ('number_of_episodes' in result &&
                    result.number_of_episodes + 'eps') ||
                    null,
                  'episode_run_time' in result &&
                    result.episode_run_time.length > 0 &&
                    result.episode_run_time.join(' - ') + 'Min',
                  'languages' in result &&
                    result.languages
                      .map((lng) =>
                        new Intl.DisplayNames('en', { type: 'language' }).of(
                          lng,
                        ),
                      )
                      .join(', '),
                  'runtime' in result && result.runtime + ' Mins',
                ]}
              />
            </div>

            <button>
              More info <ArrowDownward />
            </button>
          </div>
        )}

        <FormatParagraph
          hideShowClickHere={!original}
          para={
            'description' in result ?
              (result.description as string)
            : result.overview || ''
          }
        />
      </motion.div>
    )
  );
}

function OpenedMoreInfo({
  original,
  result,
  moreInfoOpen,
  setMoreInfoOpen,
}: MoreInfoProps) {
  return (
    <AnimatePresence>
      {moreInfoOpen && (
        <motion.div
          initial={{
            background: 'rgba(0,0,0,0.0)',
            backdropFilter: 'blur(0px)',
          }}
          animate={{
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(64px)',
          }}
          exit={{
            background: 'rgba(0,0,0,0.0)',
            backdropFilter: 'blur(0px)',
          }}
          className={moreInfoOpen ? styles.moreInfoOverlay : ''}
        >
          <motion.div
            layout
            layoutId="moreInfoLayout"
            className={styles.moreInfoContainer}
          >
            <div>
              {!original && (
                <motion.div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Star color="warning" />
                  <Separator
                    gap={8}
                    values={[
                      `${result.vote_average?.toFixed(1) || null} (${
                        result?.vote_count?.toLocaleString() || null
                      })`,
                      ('number_of_episodes' in result &&
                        result.number_of_episodes + 'eps') ||
                        null,
                      'episode_run_time' in result &&
                        result.episode_run_time.length > 0 &&
                        result.episode_run_time.join(' - ') + 'Min',
                      'languages' in result &&
                        result.languages
                          .map((lng) =>
                            new Intl.DisplayNames('en', {
                              type: 'language',
                            }).of(lng),
                          )
                          .join(', '),
                      'runtime' in result && result.runtime + ' mins',
                    ]}
                  />
                </motion.div>
              )}
              <button onClick={() => setMoreInfoOpen(false)}>
                <Close />
              </button>
            </div>

            <FormatParagraph
              para={
                'description' in result ?
                  (result.description as string)
                : result.overview || ''
              }
            />
            {/* <MoreInfo
              result={result}
              id={result.id}
              media_type={result.media_type}
            /> */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Buttons({ result, original }: { result: Result; original: boolean }) {
  const { playerState } = useYoutubePlayer();
  return (
    <>
      {original && (
        <Link href={getPlaybackUrl(String(result.id))}>
          <button>
            <div
              style={{
                paddingLeft: '2rem',
              }}
            >
              Watch Now
            </div>
            <span>
              <PlayArrowRounded fontSize="large" />
            </span>
          </button>
        </Link>
      )}

      <motion.div
        layout="position"
        style={
          playerState.playing ?
            {
              position: 'absolute',
              bottom: 0,
              left: 0,

              margin: '4rem',
            }
          : {
              position: 'relative',
            }
        }
      >
        {!original && <YoutubeControlButtons size="large" />}
      </motion.div>
    </>
  );
}

function Poster({ result }: { result: Result }) {
  return (
    <HideWhenPlayerIsPlaying
      style={{
        pointerEvents: 'none',
      }}
    >
      {result.poster_path && (
        <FadeImageOnLoad
          imageSrc={result.poster_path}
          duration={2}
          imageContainer={{
            className: styles.backdropImage,
          }}
          image={{
            layout: 'fill',
          }}
        />
      )}
    </HideWhenPlayerIsPlaying>
  );
}

type BackdropProps = {
  result: Result;
  onMouseMove: () => void;
  layout_type: string | undefined;
  animating: boolean;
  original: boolean;
};

function Backdrop({
  result,
  onMouseMove,
  layout_type,
  animating,
  original,
}: BackdropProps) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        height: '100vh',
        width: '100vw',
        left: 0,
        top: 0,
      }}
      onMouseMove={onMouseMove}
    >
      <motion.div
        className={styles.backdropImage + ' ' + styles.backdropImageBlurred}
      >
        {!animating && <YoutubeVideoPlayer />}
        {!layout_type ?
          <FadeImageOnLoad
            imageSrc={result.backdrop_path}
            // original={original}
            duration={2}
            imageContainer={{ className: styles.backdropImage }}
            image={{
              layout: 'fill',
            }}
          />
        : <Image
            src={
              original ?
                '/api/static/' + result.backdrop_path
              : getImageUrl(result.backdrop_path ?? '')
            }
            alt="image"
            fill
          />
        }
      </motion.div>
    </motion.div>
  );
}

const useHideUntilMouseInactivity = () => {
  const [hideAll, setHideAll] = useState(true);

  const hideTimeOutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { playerState } = useYoutubePlayer();

  function onMouseMove() {
    // if (!hideAll) return;
    hideTimeOutRef.current && clearTimeout(hideTimeOutRef.current);

    if (!playerState.playing) return;

    setHideAll(false);

    hideTimeOutRef.current = setTimeout(() => {
      if (!playerState.playing) return;

      console.log('clearing timeout ref in hover');
      setHideAll(true);
    }, 3000);
  }

  useEffect(() => {
    hideTimeOutRef.current && clearTimeout(hideTimeOutRef.current);

    if (!playerState.playing) return;

    console.log(playerState);

    hideTimeOutRef.current = setTimeout(() => {
      if (!playerState.playing) return;

      console.log('clearing timeout ref in useEffect');
      setHideAll(true);
    }, 3000);
  }, [playerState]);

  return { hideAll, onMouseMove };
};

function HideWhenPlayerIsPlaying({
  children,
  ...props
}: PropsWithChildren<ComponentProps<typeof motion.div>>) {
  const { playerState } = useYoutubePlayer();
  return (
    <motion.div
      {...props}
      animate={
        playerState.playing ?
          otherElementsAnimation.animate
        : otherElementsAnimation.initial
      }
    >
      {children}
    </motion.div>
  );
}

function HideUntilMouseInactive({
  hideAll,
  children,
  ...props
}: PropsWithChildren<
  { hideAll: boolean } & ComponentProps<typeof motion.div>
>) {
  return (
    <motion.div
      {...props}
      animate={
        hideAll ?
          otherElementsAnimation.animate
        : otherElementsAnimation.initial
      }
    >
      {children}
    </motion.div>
  );
}

function TvSeasonsDrawer({
  media_type,
  result,
}: {
  result: Result;
  media_type: MediaType;
}) {
  const [seasonSelect, setSeasonSelect] = useState<{
    season_number: number;
  } | null>(null);

  const [seasonInfo, setSeasonInfo] = useState(
    media_type === 'tv' ? 'seasonInfo' in result && result.seasonInfo : null,
  );

  const [rightButtonDisplay, setRightButtonDisplay] = useState(false);

  useEffect(() => {
    if (media_type !== 'tv') return;

    console.log('getting season info');

    if (seasonSelect) {
      (async () => {
        const info = await getSeasonInfo(
          result.id as number,
          seasonSelect.season_number,
        );
        setSeasonInfo(info);
      })();
    }
  }, [seasonSelect]);

  const episodeWrapperRef = useRef<HTMLDivElement | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  console.log(result);

  useEffect(() => {
    if (!episodeWrapperRef.current) return;

    setRightButtonDisplay(
      (scrollLeft <
        Math.floor(
          episodeWrapperRef.current?.scrollWidth -
            episodeWrapperRef.current?.clientWidth,
        ) ||
        scrollLeft < 1) &&
        episodeWrapperRef.current.clientWidth !==
          episodeWrapperRef.current.scrollWidth,
    );
  }, [episodeWrapperRef, scrollLeft, seasonInfo]);

  function rightButtonClick() {
    if (!episodeWrapperRef.current) return;

    episodeWrapperRef.current.scrollLeft +=
      episodeWrapperRef.current.clientWidth / 1.2;

    setScrollLeft(
      Math.min(
        episodeWrapperRef.current.scrollLeft +
          episodeWrapperRef.current.clientWidth / 1.2,
        episodeWrapperRef.current.scrollWidth -
          episodeWrapperRef.current.clientWidth,
      ),
    );
  }

  function leftButtonClick() {
    if (!episodeWrapperRef.current) return;

    episodeWrapperRef.current.scroll({
      left: Math.max(
        episodeWrapperRef.current.scrollLeft -
          episodeWrapperRef.current.clientWidth / 1.2,
        0,
      ),
      behavior: 'smooth',
    });

    setScrollLeft(
      Math.max(
        episodeWrapperRef.current.scrollLeft -
          episodeWrapperRef.current.clientWidth / 1.2,
        0,
      ),
    );
  }
  return (
    seasonInfo && (
      <HideWhenPlayerIsPlaying className={styles.seasonContainer}>
        <div className={styles.seasonSelectorContainer}>
          <Select
            onChange={(option) => {
              setSeasonSelect({ season_number: Number(option.value) });
            }}
            defaultValue={1}
            options={(result as TvResult).seasons.map((e) => ({
              label: e.name,
              value: String(e.season_number),
            }))}
          />
          <div className={styles.episodeScrollButtons}>
            <button
              disabled={scrollLeft < 1}
              onClick={leftButtonClick}
              className={styles.leftButton}
            >
              <ArrowLeft fontSize="large" />
            </button>
            <button
              disabled={!rightButtonDisplay}
              onClick={rightButtonClick}
              className={styles.rightButton}
            >
              <ArrowRight fontSize="large" />
            </button>
          </div>
        </div>
        <div className={styles.tvContainer}>
          <div
            ref={(el) => {
              episodeWrapperRef.current = el;
            }}
            className={styles.episodesContainer}
          >
            <div className={styles.episodeWrapper}>
              {seasonInfo.episodes.map(
                (epi, index) =>
                  epi.still_path !== null && (
                    <div
                      key={epi.id}
                      className={styles.episode}
                    >
                      <span className={styles.episodeNumber}>
                        {(index + 1 < 10 ? '0' : '') + (index + 1)}
                      </span>
                      <span className={styles.episodeName}>{epi.name}</span>
                      <FadeImageOnLoad
                        loadingBackground
                        imageSrc={epi.still_path}
                        duration={0.5}
                        imageContainer={{
                          className: styles.episodeImageContainer,
                          style: {
                            height: 148,
                            width: 228,
                            contain: 'size',
                          },
                        }}
                        image={{
                          width: 228,
                          height: 148,
                        }}
                      />
                    </div>
                  ),
              )}
            </div>
          </div>
        </div>
      </HideWhenPlayerIsPlaying>
    )
  );
}

export default TitleView;
