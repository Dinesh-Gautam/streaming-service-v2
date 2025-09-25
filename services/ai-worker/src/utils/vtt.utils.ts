import { AiChaptersData, AiSubtitleEntry } from '../models/types';

export function timecodeToSeconds(timecode: string): number {
  const parts = timecode.split(':').map(Number);
  let seconds = 0;
  if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    seconds = parts[0];
  }
  return isNaN(seconds) ? 0 : Math.max(0, seconds);
}

export function secondsToVttTime(seconds: number): string {
  const validSeconds = Math.max(0, seconds);
  const totalMilliseconds = Math.round(validSeconds * 1000);
  const ms = (totalMilliseconds % 1000).toString().padStart(3, '0');
  const totalSecondsInt = Math.floor(totalMilliseconds / 1000);
  const secs = (totalSecondsInt % 60).toString().padStart(2, '0');
  const totalMinutesInt = Math.floor(totalSecondsInt / 60);
  const minutes = (totalMinutesInt % 60).toString().padStart(2, '0');
  const hours = Math.floor(totalMinutesInt / 60)
    .toString()
    .padStart(2, '0');
  return `${hours}:${minutes}:${secs}.${ms}`;
}

export function formatVttTime(timecode: string): string {
  const seconds = timecodeToSeconds(timecode);
  return secondsToVttTime(seconds);
}

export function constructChaptersVtt(chapters: AiChaptersData): string {
  let vttContent = 'WEBVTT\n\n';
  chapters.sort(
    (a, b) => timecodeToSeconds(a.timecode) - timecodeToSeconds(b.timecode),
  );
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const nextChapter = chapters[i + 1];
    const startTimeFormatted = formatVttTime(chapter.timecode);
    const endTimeFormatted =
      nextChapter ?
        formatVttTime(nextChapter.timecode)
      : secondsToVttTime(timecodeToSeconds(chapter.timecode) + 300);
    vttContent += `${startTimeFormatted} --> ${endTimeFormatted}\n${chapter.chapterTitle}\n\n`;
  }
  return vttContent;
}

export function constructSubtitlesVtt(subtitles: AiSubtitleEntry[]): string {
  return (
    'WEBVTT\n\n' +
    subtitles
      .filter((sub) => sub.text.trim() !== '')
      .map(
        (sub) =>
          `${formatVttTime(sub.startTimecode)} --> ${formatVttTime(
            sub.endTimecode,
          )}\n${sub.text.trim()}`,
      )
      .join('\n\n')
  );
}
