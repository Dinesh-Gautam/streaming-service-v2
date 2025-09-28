export type AiSubtitleEntry = {
  startTimecode: string;
  endTimecode: string;
  text: string;
  voiceGender: 'male' | 'female';
  voiceType: 'neutral' | 'angry' | 'happy';
};

export type AiChaptersData = {
  timecode: string;
  chapterTitle: string;
}[];

export type AiVideoAnalysisResponseType = {
  title: string;
  description: string;
  genres: string[];
  imageGenerationPrompt: string;
  chaptersVtt?: AiChaptersData;
  subtitles: Record<string, AiSubtitleEntry[]>;
  geminiTtsPrompts?: {
    style: string;
    [x: string]: string;
  };
};
