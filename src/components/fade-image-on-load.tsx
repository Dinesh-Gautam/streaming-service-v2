'use client';

import { HTMLAttributes, PropsWithChildren, useState } from 'react';
import Image, { ImageProps } from 'next/image';

import { AnimatePresence, motion, MotionProps } from 'motion/react';

import Suspense from '@/components/suspense-loading';
import { getImageUrl } from '@/utils/tmdb';

type FadeImageOnLoad = {
  /**
   * Whether to show a loading background or not
   */
  loadingBackground?: boolean;
  /**
   * Whether to show the image in ambient mode or not, addes a glow effect to the image
   */
  ambientMode?: boolean;
  /**
   * Image source to load
   */
  imageSrc?: string;
  /**
   * directly load this url, don't use the `getImageUrl` function @see getImageUrl
   */
  rawImageSrc?: string;
  /**
   * Whether to position the image absolutely or not
   */
  positionAbsolute?: boolean;
  /**
   * Attributes for the container for the image
   */
  imageContainer?: HTMLAttributes<HTMLDivElement> &
    MotionProps &
    Partial<{
      'data-index': number;
      'data-middle': boolean;
      'data-type': string;
      'data-original': boolean;
    }>;
  /**
   * props for the image component
   */
  image: Partial<ImageProps>;
  /**
   * Duration of the fade in animation
   */
  duration?: number;
  /**
   * Opacity of the image
   */
  opacity?: number;
  /**
   * amout of blur of the image glow effect
   */
  blur?: number;
  /**
   * saturation of the image glow effect
   */
  saturation?: number;
  /**
   * determines how bright the image glow effect is
   */
  brightness?: number;
  /**
   * scale of the image glow effect
   */
  scale?: number;
  /**
   * More options for the glow/ambinet effect
   */
  ambientOptions?: React.CSSProperties;
} & PropsWithChildren;

/**
 * Fades in an image when it is loaded.
 */
function FadeImageOnLoad({
  duration = 1,
  opacity = 1,
  blur = 2,
  saturation = 1,
  brightness = 1,
  scale = 2,
  ...props
}: FadeImageOnLoad) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const initialVariant = {
    initialVariant: {
      opacity: 0,
    },
    animateVariant: {
      opacity: 0,
    },
  };

  const imageLoadedVariant = {
    initialVariant: {
      opacity: 0,
    },
    animateVariant: {
      opacity: 1,
      transition: {
        type: 'ease',
        ease: 'easeOut',
        delay: 0.2,
        duration: duration,
      },
    },
  };

  return (
    <motion.div {...props.imageContainer}>
      <AnimatePresence>
        {props.loadingBackground && !imageLoaded && <Suspense />}
      </AnimatePresence>
      <motion.div
        style={{
          pointerEvents: 'none',
          height: '100%',
          width: '100%',
        }}
        initial="initialVariant"
        animate="animateVariant"
        variants={!imageLoaded ? initialVariant : imageLoadedVariant}
      >
        {
          <>
            {props.ambientMode && props.imageSrc && (
              <Image
                {...props.image}
                src={getImageUrl(props.imageSrc)}
                alt={props.imageSrc}
                style={{
                  filter: `blur(${blur}px) saturate(${saturation}) brightness(${brightness})`,
                  opacity: opacity,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%,-50%) scale(${scale})`,
                  zIndex: -100,
                  ...props.ambientOptions,
                }}
              />
            )}
            {(props.imageSrc || props.rawImageSrc) && (
              <Image
                {...props.image}
                src={props.rawImageSrc ?? getImageUrl(props.imageSrc ?? '')}
                onLoad={() => setImageLoaded(true)}
                alt={props.imageSrc ?? 'Image'}
              />
            )}
          </>
        }
        {props.children}
      </motion.div>
    </motion.div>
  );
}

export default FadeImageOnLoad;
