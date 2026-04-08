import React, { useState, useCallback, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Image as ImageIcon } from "lucide-react";
import { WordDataType } from '@/types/wordTypes';
import { useGenerateImages } from '@/hooks/use-generate-images';
import { useWordCache, NavigationMode } from '@/hooks/use-word-cache';
import { toast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import WordImages from "../history/WordImages"; // Import the component to display images

interface WordManagementTableProps {
  words: WordDataType[];
  onDelete: (wordId: number) => void;
}

export const WordManagementTable: React.FC<WordManagementTableProps> = ({ words, onDelete }) => {
  const { generateImages, isGeneratingImages } = useGenerateImages();
  const wordCache = useWordCache();

  const [showExampleDialog, setShowExampleDialog] = useState(false);
  const [selectedExampleIndex, setSelectedExampleIndex] = useState<number | null>(null);
  const [currentWord, setCurrentWord] = useState<WordDataType | null>(null);
  const [detailLoadingWordId, setDetailLoadingWordId] = useState<number | null>(null);
  const [imageGeneratingWordId, setImageGeneratingWordId] = useState<number | null>(null); // Track which word is generating images
  const [expandedWordId, setExpandedWordId] = useState<number | null>(null);
  
  // State to hold the word intended for regeneration
  const [wordToRegenerate, setWordToRegenerate] = useState<WordDataType | null>(null);

  const englishExamples = (currentWord?.content?.examples?.en && Array.isArray(currentWord.content.examples.en)) 
    ? currentWord.content.examples.en 
    : [];

  // Click handler simply sets the intent to regenerate a word
  const handleRegenerateClick = (word: WordDataType) => {
    if (detailLoadingWordId || isGeneratingImages) return;
    setWordToRegenerate(word);
    setDetailLoadingWordId(word.id);
  };

  // Effect to fetch word details when the intent is set
  useEffect(() => {
    if (wordToRegenerate) {
      wordCache.fetchWord(wordToRegenerate.word_text, NavigationMode.Search, false);
    }
  }, [wordToRegenerate, wordCache.fetchWord]);

  // Effect to react to the fetched word from the cache
  useEffect(() => {
    if (wordCache.currentWord && wordToRegenerate && wordCache.currentWord.word_text === wordToRegenerate.word_text) {
      if (wordCache.currentWord.content?.examples?.en?.length) {
        setCurrentWord(wordCache.currentWord);
        setSelectedExampleIndex(0);
        setShowExampleDialog(true);
      } else {
        toast({
            title: "无例句",
            description: `"${wordToRegenerate.word_text}" 没有可用的英文例句来生成图片。`,
            variant: "destructive",
        });
      }
      // Reset intent and loading state
      setWordToRegenerate(null);
      setDetailLoadingWordId(null);
    }
  }, [wordCache.currentWord, wordToRegenerate]);

  const handleExampleSelected = useCallback(async () => {
    if (!currentWord || selectedExampleIndex === null) return;

    const example = englishExamples[selectedExampleIndex];
    if (example === undefined) return;

    setShowExampleDialog(false);
    setImageGeneratingWordId(currentWord.id);

    try {
      const urls = await generateImages(currentWord.word_text, example, true);

      if (urls && urls.length > 0) {
        toast({
          title: "成功",
          description: `成功为 "${currentWord.word_text}" 生成了新图片。`,
        });
        // Optionally, refresh data here or update state to show new images
        setExpandedWordId(currentWord.id); // Expand the row to show new images
      } else {
        toast({
          title: "生成失败",
          description: `为 "${currentWord.word_text}" 生成图片时发生错误。`,
          variant: "destructive",
        });
      }
    } finally {
      setCurrentWord(null);
      setSelectedExampleIndex(null);
      setImageGeneratingWordId(null); // Clear loading state
    }
  }, [currentWord, selectedExampleIndex, englishExamples, generateImages, toast]);

  return (
    <>
      <div className="mb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Word</TableHead>
              <TableHead>Meaning</TableHead>
              <TableHead>Phonetic</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.map((word) => (
              <React.Fragment key={word.id}>
                <TableRow 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => setExpandedWordId(prevId => prevId === word.id ? null : word.id)}
                >
                  <TableCell>{word.id}</TableCell>
                  <TableCell className="font-medium">{word.word_text}</TableCell>
                  <TableCell>{word.meaning}</TableCell>
                  <TableCell>{word.phonetic}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); handleRegenerateClick(word); }} 
                      title="Regenerate Images"
                      disabled={detailLoadingWordId === word.id || imageGeneratingWordId === word.id}
                    >
                      {(detailLoadingWordId === word.id || imageGeneratingWordId === word.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                          <ImageIcon className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="sr-only">Regenerate Images</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(word.id); }} title="Delete Word">
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedWordId === word.id && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <WordImages wordText={word.word_text} />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
    </div>

    <Dialog open={showExampleDialog} onOpenChange={setShowExampleDialog}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>为 "{currentWord?.word_text}" 选择一个例句生成图片</DialogTitle>
          </DialogHeader>
          {englishExamples.length > 0 ? (
            <RadioGroup
              onValueChange={(value) => setSelectedExampleIndex(Number(value))}
              value={selectedExampleIndex !== null ? String(selectedExampleIndex) : undefined}
              className="max-h-[300px] overflow-y-auto pr-4"
            >
              {englishExamples.map((example: string, index: number) => (
                <div key={index} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <RadioGroupItem value={String(index)} id={`example-${index}`} />
                  <Label htmlFor={`example-${index}`} className="cursor-pointer text-base font-normal leading-relaxed">
                    {example}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <p className="text-center text-gray-500">没有找到可用的英文例句。</p>
          )}
          <DialogFooter>
            <Button
              onClick={handleExampleSelected}
              disabled={selectedExampleIndex === null || isGeneratingImages}
            >
              {isGeneratingImages ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                "确定并生成"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};