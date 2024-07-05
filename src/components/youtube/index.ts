// import YoutubeVideoPlayerProvider from './context';
// import YoutubeControlButtons from './controls';
// import YoutubeVideoPlayer from './player';

import dynamic from 'next/dynamic';

const YoutubeVideoPlayerProvider = dynamic(() => import('./context'), {
  ssr: false,
});
const YoutubeControlButtons = dynamic(() => import('./controls'), {
  ssr: false,
});
const YoutubeVideoPlayer = dynamic(() => import('./player'), { ssr: false });

export {
  YoutubeVideoPlayerProvider,
  YoutubeControlButtons,
  YoutubeVideoPlayer,
};
