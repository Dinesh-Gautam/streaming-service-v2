import dynamic from 'next/dynamic';

import YoutubeVideoPlayerProvider from './context';
import YoutubeControlButtons from './controls';

const YoutubeVideoPlayer = dynamic(() => import('./player'), { ssr: false });

export {
  YoutubeVideoPlayerProvider,
  YoutubeControlButtons,
  YoutubeVideoPlayer,
};
