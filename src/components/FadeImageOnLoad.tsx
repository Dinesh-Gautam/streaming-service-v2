"use client"

import { getImageUrl } from "@/utils/tmdb";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { HTMLAttributes, useState } from "react";
import Suspense from "./Suspense";

type FadeImageOnLoad = {
  loadingBackground: boolean,
  ambientMode: boolean,
  imageSrc: string,
  rawImageSrc: string,
  duration: number,
  attr: {
    imageContainer: ReturnType<typeof motion.div>,
    image: HTMLAttributes<HTMLImageElement>,
  },
  ambientOptions: {
    opacity?: number,
    blur: number,
    saturation: number,
    brightness: number,
    scale: number,
  }
  children: React.ReactNode,
}

function FadeImageOnLoad(props: FadeImageOnLoad) {
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
        type: "ease",
        ease: "easeOut",
        delay: 0.2,
        duration: props.duration || 1,
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
        {...props.attr.imageContainer}
      >
        {
          <>
            {props.ambientMode && (
              <Image
                src={getImageUrl(props.imageSrc)}
                alt={props.imageSrc}
                style={{
                  filter: `blur(${props.ambientOptions?.blur || 24
                    }px) saturate(${props.ambientOptions?.saturation ?? 1
                    }) brightness(${props.ambientOptions?.brightness ?? 1})`,
                  opacity: 0.7,
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%,-50%) scale(${props.ambientOptions?.scale || 2
                    })`,
                  ...props.ambientOptions,
                  zIndex: -100,
                }}
                {...props.attr.image}
              />
            )}
            {(props.imageSrc || props.rawImageSrc) && (
              <Image
                src={
                  !props.imageSrc
                    ? props.rawImageSrc
                    : getImageUrl(props.imageSrc)
                }
                onLoad={() => setImageLoaded(true)}
                alt={props.imageSrc}
                {...props.attr.image}
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
