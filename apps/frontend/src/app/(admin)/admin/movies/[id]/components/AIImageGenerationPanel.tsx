'use client';

import React from 'react';
import Image from 'next/image';

import { Loader2, Sparkles, Wand2 } from 'lucide-react';

import { Button } from '@/admin/components/ui/button';
import { Label } from '@/admin/components/ui/label';
import { Textarea } from '@/admin/components/ui/textarea';
import { cn } from '@/admin/lib/utils';
import { ShineBorder } from '@/components/magicui/shine-border';

import { SparkelIcon } from './SegmentedProgressBar';

interface AIImageGenerationPanelProps {
  type: 'poster' | 'backdrop';
  prompt: string;
  setPrompt: (prompt: string) => void;
  isGenerating: boolean;
  generationError: string | null;
  generatedPath: string | null;
  onGenerate: () => void;
  onUseImage: (path: string) => void;
  isSuggesting: boolean;
  onSuggest: () => void;
  canSuggest: boolean;
  initialAIPath: string | null;
  onUseInitialAIImage: () => void;
  currentPath?: string;
}

export function AIImageGenerationPanel({
  type,
  prompt,
  setPrompt,
  isGenerating,
  generationError,
  generatedPath,
  onGenerate,
  onUseImage,
  isSuggesting,
  onSuggest,
  canSuggest,
  initialAIPath,
  onUseInitialAIImage,
  currentPath,
}: AIImageGenerationPanelProps) {
  const title = type === 'poster' ? 'Poster' : 'Backdrop';
  const placeholder =
    type === 'poster' ?
      'e.g., A lone astronaut gazing at a swirling nebula...'
    : 'e.g., A vast futuristic cityscape at sunset...';

  return (
    <div className="mt-6 p-4 border rounded-md space-y-4 bg-gradient-to-br from-purple-50/5 via-pink-50/5 to-orange-50/5 relative overflow-hidden">
      <ShineBorder shineColor={['#D130B9', '#DC3639']} />
      {initialAIPath && (
        <>
          <div className="space-y-3  relative">
            <h4 className="font-medium flex items-center gap-2">
              <SparkelIcon />
              <span className="bg-clip-text text-transparent font-semibold bg-gradient-to-r from-pink-500 to-orange-500">
                Initially Generated {title}
              </span>
            </h4>
            <div className="flex flex-col gap-2 items-start">
              <Image
                src={'/api/static/' + initialAIPath}
                alt={`Initially Generated ${title}`}
                width={type === 'poster' ? 100 : 200}
                height={type === 'poster' ? 150 : 112}
                className="rounded-md object-cover border"
                unoptimized
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onUseInitialAIImage}
                disabled={currentPath === initialAIPath}
              >
                {currentPath === initialAIPath ?
                  `Using Initial AI ${title}`
                : `Use Initial AI ${title}`}
              </Button>
            </div>
          </div>
          <span className="block mx-auto w-fit text-sm text-muted-foreground self-center">
            OR
          </span>
        </>
      )}

      <h4 className="font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500 w-fit">
        <SparkelIcon /> Generate {title} with AI Prompt
      </h4>
      <div className="space-y-2 relative">
        <Label htmlFor={`${type}-prompt`}>{title} Prompt</Label>
        <div className="relative">
          {isSuggesting && (
            <div className="absolute inset-0 bg-gradient-to-r from-pink-100/20 via-background/5 to-purple-100/20 animate-pulse rounded-md z-0"></div>
          )}
          <Textarea
            id={`${type}-prompt`}
            placeholder={placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={cn(
              'min-h-[80px] bg-background/80 backdrop-blur-sm relative z-10',
              isSuggesting && 'opacity-70',
            )}
            disabled={isGenerating || isSuggesting}
          />
        </div>
        {isSuggesting && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {prompt.trim() ? 'Enhancing prompt...' : 'Generating prompt...'}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSuggest}
          disabled={!canSuggest || isGenerating || isSuggesting}
          className="relative overflow-hidden group transition-opacity duration-300"
        >
          <span className="relative z-10 flex items-center gap-1">
            {isSuggesting ?
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {prompt.trim() ? 'Enhancing...' : 'Suggesting...'}
              </>
            : <>
                <Sparkles className="w-3 h-3" />{' '}
                {prompt.trim() ? 'Enhance' : 'Suggest'}
              </>
            }
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onGenerate}
          disabled={!prompt || isGenerating}
          className={cn(
            'relative overflow-hidden group transition-opacity duration-300',
            'bg-gradient-to-r  from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white',
          )}
        >
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isGenerating ? 'Generating...' : `Generate ${title}`}
        </Button>
      </div>

      {generatedPath && (
        <div className="mt-4 pt-4 border-t border-dashed">
          <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-pink-500" /> Prompt-Generated {title}
          </h5>
          <div className="flex flex-col sm:flex-row gap-4 items-center relative">
            <Image
              src={'/api/static/' + generatedPath}
              alt={`Prompt Generated ${title}`}
              width={type === 'poster' ? 100 : 200}
              height={type === 'poster' ? 150 : 112}
              className="rounded-md object-cover border"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onUseImage(generatedPath)}
              disabled={currentPath === generatedPath || isGenerating}
            >
              {currentPath === generatedPath ?
                `Using This ${title}`
              : `Use This ${title}`}
            </Button>
          </div>
        </div>
      )}

      {isGenerating && !generatedPath && (
        <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-center h-[180px] bg-muted/30 rounded-md relative overflow-hidden">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isGenerating && generationError && (
        <div className="mt-4 pt-4 border-t border-dashed">
          <div className="p-2 px-3 bg-secondary text-red-400 shadow-md">
            <h5 className="font-medium text-sm mb-1 flex items-center gap-2">
              Generation Error
            </h5>
            <p className="text-sm">{generationError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
