import { Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { ExplainInputSchemaInput, generateExplanation } from '@/ai/flows/explain-sentence';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { pauseSpeech } from '@/services/tts';

interface ExplanationPopoverProps {
  sentence: string;
  position: { top: number; left: number };
}

export function ExplanationPopover({ sentence, position }: ExplanationPopoverProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const getExplanation = useCallback(async () => {
    try {
      pauseSpeech();
      setIsLoading(true);
      const explanationInput: ExplainInputSchemaInput = { text: sentence };
      const explanationResult = await generateExplanation(explanationInput);
      setExplanation(explanationResult.explanation);
    } catch (error) {
      console.error('Error getting explanation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get explanation. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [sentence]);

  // Get explanation when popover opens
  useEffect(() => {
    if (isOpen && !explanation && !isLoading) {
      getExplanation();
    }
  }, [isOpen, explanation, isLoading, getExplanation]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='absolute z-50'
          style={{
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          Explain
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80'>
        {isLoading ? (
          <div className='flex items-center justify-center p-4'>
            <Loader2 className='h-6 w-6 animate-spin' />
          </div>
        ) : explanation ? (
          <div className='space-y-2'>
            <h4 className='font-medium'>Explanation</h4>
            <p className='text-sm text-muted-foreground'>{explanation}</p>
          </div>
        ) : (
          <div className='space-y-2'>
            <h4 className='font-medium'>Get Explanation</h4>
            <p className='text-sm text-muted-foreground'>Getting explanation...</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
