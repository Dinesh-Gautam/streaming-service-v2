import { AiSubtitleEntry } from '../models/types';
import { timecodeToSeconds } from './vtt.utils';

const MAX_SILENCE_DURATION_MS = 500; // Max silence between subtitles to be merged (in ms)
const MAX_SUBTITLE_DURATION_S = 7; // Max duration of a merged subtitle block (in seconds)

export interface SubtitleBlock {
  entries: AiSubtitleEntry[];
  startTime: number;
  endTime: number;
  text: string;
  langCode: string;
  voiceGender: 'male' | 'female';
}

/**
 * Merges adjacent subtitle entries into blocks based on timing and content.
 * This helps create more natural-sounding TTS output and avoids audio overlaps.
 * @param subtitles - An array of AI-generated subtitle entries.
 * @param langCode - The language code for the subtitles.
 * @returns An array of merged subtitle blocks.
 */
export function groupSubtitles(
  subtitles: AiSubtitleEntry[],
  langCode: string,
): SubtitleBlock[] {
  if (!subtitles || subtitles.length === 0) {
    return [];
  }

  const blocks: SubtitleBlock[] = [];
  let currentBlock: SubtitleBlock | null = null;

  for (const subtitle of subtitles) {
    // Skip subtitles with no text
    if (!subtitle.text || subtitle.text.trim().length === 0) {
      continue;
    }

    const startTime = timecodeToSeconds(subtitle.startTimecode);
    const endTime = timecodeToSeconds(subtitle.endTimecode);

    if (currentBlock) {
      const silenceDuration = startTime - currentBlock.endTime;
      const blockDuration = endTime - currentBlock.startTime;

      // Check if the new subtitle can be merged with the current block
      if (
        silenceDuration < MAX_SILENCE_DURATION_MS / 1000 &&
        blockDuration < MAX_SUBTITLE_DURATION_S &&
        currentBlock.voiceGender === subtitle.voiceGender
      ) {
        // Merge with current block
        currentBlock.entries.push(subtitle);
        currentBlock.endTime = endTime;
        currentBlock.text += ` ${subtitle.text.trim()}`;
      } else {
        // Finalize the current block and start a new one
        blocks.push(currentBlock);
        currentBlock = {
          entries: [subtitle],
          startTime,
          endTime,
          text: subtitle.text.trim(),
          langCode,
          voiceGender: subtitle.voiceGender,
        };
      }
    } else {
      // Start the first block
      currentBlock = {
        entries: [subtitle],
        startTime,
        endTime,
        text: subtitle.text.trim(),
        langCode,
        voiceGender: subtitle.voiceGender,
      };
    }
  }

  // Add the last block if it exists
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}
