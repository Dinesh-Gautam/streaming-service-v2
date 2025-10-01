'use client';

import { Check, Sparkles } from 'lucide-react';

import { Button } from '@/admin/components/ui/button';
import { ShineBorder } from '@/components/magicui/shine-border';

import { SparkelIcon } from './SegmentedProgressBar';

interface AiSuggestionsProps {
  aiOutput: {
    data?: {
      title?: string;
      description?: string;
      genres?: string[];
    };
  } | null;
  isApplied: boolean;
  isApplying: boolean;
  onApply: () => void;
}

export function AiSuggestions({
  aiOutput,
  isApplied,
  isApplying,
  onApply,
}: AiSuggestionsProps) {
  if (!aiOutput?.data) return null;

  const { title, description, genres } = aiOutput.data;

  return (
    <div className="mt-6 p-4 rounded-md bg-muted/30 relative">
      <ShineBorder shineColor={['#D130B9', '#DC3639']} />
      <h5 className="font-semibold mb-3 flex items-center gap-2">
        <SparkelIcon />
        AI Generated Suggestions
      </h5>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          AI has analyzed your video and generated the following suggestions:
        </p>
        <div className="grid gap-4">
          {title && (
            <div className="p-3 bg-background rounded-md border">
              <h6 className="text-sm font-medium mb-1">Title Suggestion</h6>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          )}
          {description && (
            <div className="p-3 bg-background rounded-md border">
              <h6 className="text-sm font-medium mb-1">
                Description Suggestion
              </h6>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          )}
          {genres && genres.length > 0 && (
            <div className="p-3 bg-background rounded-md border">
              <h6 className="text-sm font-medium mb-1">Genre Suggestions</h6>
              <p className="text-sm text-muted-foreground">
                {genres.join(', ')}
              </p>
            </div>
          )}
        </div>

        {(title || description || (genres && genres.length > 0)) && (
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={onApply}
              disabled={isApplied || isApplying}
              variant="outline"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isApplying ?
                  'Applying...'
                : isApplied ?
                  <>
                    <Check className="h-4 w-4" /> Applied
                  </>
                : <>
                    <Sparkles className="h-4 w-4" /> Apply Suggestions
                  </>
                }
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
