declare namespace JSX {
  interface IntrinsicElements {
    'lite-youtube': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      videoid: string;
      params?: string;
      'js-api': boolean;
    };
  }
}

declare module 'lite-youtube-embed' {
  export default class LiteYTEmbed extends HTMLElement {
    fetchYTPlayerApi(): void;
    getYTPlayer(): Promise<YT.Player | undefined>;
    upgradePosterImage(): void;
    createBasicIframe(): HTMLIFrameElement;
    addNoscriptIframe(): void;
    getParams(): URLSearchParams;
    activate(): Promise<void>;
    addYTPlayerIframe(): Promise<void>;
  }
}
