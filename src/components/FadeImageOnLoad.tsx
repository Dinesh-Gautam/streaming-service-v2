'use client';

import { HTMLAttributes, PropsWithChildren, useState } from 'react';
import Image, { ImageProps } from 'next/image';

import Suspense from '@/components/Suspense';
import { getImageUrl } from '@/utils/tmdb';
import { AnimatePresence, motion, MotionProps } from 'framer-motion';

type FadeImageOnLoad = {
  loadingBackground: boolean;
  ambientMode: boolean;
  imageSrc: string;
  rawImageSrc?: string;
  positionAbsolute: boolean;
  imageContainer: HTMLAttributes<HTMLDivElement> & MotionProps;
  image: Partial<ImageProps>;
  duration?: number;
  opacity?: number;
  blur?: number;
  saturation?: number;
  brightness?: number;
  scale?: number;
  ambientOptions?: React.CSSProperties;
} & PropsWithChildren;

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
    <>
      <AnimatePresence>
        {props.loadingBackground && !imageLoaded && <Suspense />}
      </AnimatePresence>
      <motion.div
        initial="initialVariant"
        animate="animateVariant"
        variants={!imageLoaded ? initialVariant : imageLoadedVariant}
        {...props.imageContainer}
      >
        {
          <>
            {props.ambientMode && (
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
                src={props.rawImageSrc ?? getImageUrl(props.imageSrc)}
                onLoad={() => setImageLoaded(true)}
                alt={props.imageSrc}
              />
            )}
          </>
        }
        {props.children}
      </motion.div>
    </>
  );
}

export default FadeImageOnLoad;
