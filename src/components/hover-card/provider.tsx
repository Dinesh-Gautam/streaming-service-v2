'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useRef,
  useState,
} from 'react';

import { HoverCard } from '@/components/hover-card/card';
import type {
  hoverCardPositionState,
  HoverCardProviderProps,
} from '@/components/hover-card/types';
import { YoutubeVideoPlayerProvider } from '@/components/youtube';
import type { MediaType } from '@/lib/types';

const InitialHoverCardPositionState: hoverCardPositionState = {
  type: 'popular_movies',
  x: 0,
  y: 0,
};

export const HoverCardProvider = (props: HoverCardProviderProps) => {
  const [hoverCardPosition, setHoverCardPosition] =
    useState<hoverCardPositionState>(InitialHoverCardPositionState);

  const [hoverCardActive, setHoverCardActive] = useState(false);
  const [inContainer, setInContainer] = useState(false);
  const timeOutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearingInterval = useRef(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const [animating, setAnimating] = useState(true);

  async function clearHover() {
    if (timeOutRef.current) {
      setHoverCardActive(false);
      setHoverCardPosition(InitialHoverCardPositionState);
      console.log(timeOutRef.current);
      clearTimeout(timeOutRef.current);
      timeOutRef.current = null;
      setInContainer(false);
      setAnimating(false);
    }
  }

  function getHoverCardMovie() {
    return props[hoverCardPosition.type || 'popular_movies'][
      Number(hoverCardPosition.index ?? 0)
    ];
  }

  return (
    <>
      <div
        style={{
          position: 'relative',
          zIndex: 10,
        }}
        onMouseLeave={() => {
          if (!timeOutRef.current) return;
          if (!inContainer) {
            clearHover();
          }
        }}
        onMouseMove={(e) => {
          const target = e.target as HTMLElement;
          if (target.id === 'imageContainer') {
            if (
              target.dataset.index !== hoverCardPosition.index &&
              target.dataset.middle === 'true' &&
              !isScrolling
            ) {
              setHoverCardActive(false);
              setAnimating(true);
              timeOutRef.current && clearTimeout(timeOutRef.current);
              timeOutRef.current = setTimeout(() => {
                const rect = target.getBoundingClientRect();
                setHoverCardPosition({
                  x: rect.left + window.scrollX,
                  y: rect.top + window.scrollY,
                  height: rect.height,
                  width: rect.width,
                  original: target.dataset
                    .original as hoverCardPositionState['original'],
                  index: target.dataset
                    .index as hoverCardPositionState['index'],
                  type: target.dataset.type as hoverCardPositionState['type'],
                });
                setHoverCardActive(true);
                setInContainer(true);
              }, 300);
            }
          } else {
            if (timeOutRef.current && !clearingInterval.current) {
              clearHover();
            }
          }
        }}
      >
        {Children.map(props.children, (child) => {
          if (!isValidElement(child)) return null;
          return cloneElement(child, { ...child.props, setIsScrolling });
        })}
      </div>
      <YoutubeVideoPlayerProvider
        id={
          typeof getHoverCardMovie().id === 'number' ?
            Number(getHoverCardMovie().id)
          : null
        }
        media_type={
          (
            getHoverCardMovie() as ReturnType<typeof getHoverCardMovie> & {
              media_type?: MediaType;
            }
          )?.media_type ?? 'movie'
        }
      >
        <HoverCard
          context={{
            hoverCardPosition,
            hoverCardActive,
            timeOutRef,
            animating,
            setAnimating,
            clearHover,
            getHoverCardMovie,
          }}
        />
      </YoutubeVideoPlayerProvider>
    </>
  );
};
