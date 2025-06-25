import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Mic, Info } from 'lucide-react'; // Import Info icon for details
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { NavigationMode, useWordCache } from '@/hooks/use-word-cache';
import { WordDataType } from '@/types/wordTypes';
import { useIsMobile } from '@/hooks/use-mobile';

// Explicitly declare global interfaces for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface FlashcardModeProps {
  wordData: WordDataType;
  onNext: () => void;
  onPrevious: () => void;
  onWordChanged: (word: WordDataType) => void;
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({
  wordData,
  onNext,
  onPrevious,
  onWordChanged
}) => {
  const isMobile = useIsMobile();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isMarkedForReview, setIsMarkedForReview] = useState(false);
  const { toast } = useToast();

  const { fetchAndCacheWord } = useWordCache();

  const maxAttempts = 3;

  // Speech Recognition states and ref
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(false);

  // Ref for the answer input field
  const answerInputRef = useRef<HTMLInputElement>(null);

  // NEW: State to control visibility of word details (phonetic and meaning)
  const [showDetails, setShowDetails] = useState(false);

  // Effect to initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechRecognitionAvailable(true);

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; // Setting language to English (United States)

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "语音输入失败",
          description: `错误: ${event.error}. 请确保已授权麦克风权限。`,
          variant: "destructive",
        });
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;

    } else {
      console.warn('Speech Recognition API not supported in this browser.');
      setSpeechRecognitionAvailable(false);
      toast({
        title: "语音输入不可用",
        description: "您的浏览器不支持Web Speech API。请尝试Chrome或Edge浏览器。",
        variant: "destructive",
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  // Effect for fetching image data for the word
  useEffect(() => {
    setImageUrl(null);
    setIsLoading(true);
    setUserInput('');
    setAttempts(0);
    setIsCorrect(null);
    setIsMarkedForReview(false);
    setShowDetails(false); // NEW: Reset showDetails when word changes

    const fetchImage = async () => {
      try {
        if (wordData.imageUrls && wordData.imageUrls.length > 0) {
          setImageUrl(wordData.imageUrls[0]);
          console.log('Word already has image URLs, aborting new image request.');
          setIsLoading(false);
          return;
        }
        
        const data = await fetchAndCacheWord('', NavigationMode.Search, true);

        if (data) {
            onWordChanged(data);
            if (data.imageUrls && data.imageUrls.length > 0) {
                setImageUrl(data.imageUrls[0]);
            }
        } else {
            toast({
              title: "获取单词详情失败",
              description: `抱歉，无法加载单词。`,
              variant: "destructive",
            });
        }
      } catch (error) {
        console.error('Error fetching image:', error);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [wordData, fetchAndCacheWord, onWordChanged, toast]);

  // Effect to focus the input field when wordData changes
  useEffect(() => {
    if (answerInputRef.current && !isLoading) {
      answerInputRef.current.focus();
    }
  }, [wordData, isLoading]);

  const randomNext = () => {
    if (!wordData.imageUrls || wordData.imageUrls.length === 0) {
        console.warn("没有图片可供选择。");
        return;
    }

    const availableImages = wordData.imageUrls.filter(url => url !== imageUrl);

    if (availableImages.length === 0) {
      console.warn("没有其他不同的图片可供选择。");
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableImages.length);
    const newImageUrl = availableImages[randomIndex];
    setImageUrl(newImageUrl);
    console.log("已切换到新的图片:", newImageUrl);
  }

  const checkAnswer = (valueToCheck: string = userInput) => {
    const isAnswerCorrect = valueToCheck.toLowerCase().trim() === wordData.word_text.toLowerCase();
    setIsCorrect(isAnswerCorrect);
    
    if (isAnswerCorrect) {
      toast({
        title: "回答正确！",
        description: "自动切换到下一个单词",
      });
      
      setTimeout(() => {
        onNext();
      }, 1500);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= maxAttempts) {
        setIsMarkedForReview(true);
        toast({
          title: "已标记为重点记忆",
          description: "该单词将加入重点复习列表",
          variant: "destructive",
        });
        
        setTimeout(() => {
          onNext();
        }, 2000);
      } else {
        toast({
          title: "回答错误",
          description: `还有 ${maxAttempts - newAttempts} 次机会`,
          variant: "destructive",
        });
        setUserInput('');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userInput.trim() && !isCorrect && attempts < maxAttempts) {
      checkAnswer();
    }
  };

  const handleTouchStart = () => {
    if (speechRecognitionAvailable && recognitionRef.current && !isRecording) {
      setIsRecording(true);
      recognitionRef.current.start();
      toast({
        title: "开始录音",
        description: "请对着麦克风说话...",
      });
    } else if (!speechRecognitionAvailable) {
      toast({
        title: "不支持语音输入",
        description: "您的浏览器不支持Web Speech API，请尝试其他浏览器。",
        variant: "destructive",
      });
    }
  };

  const handleTouchEnd = () => {
    if (speechRecognitionAvailable && recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      toast({
        title: "录音结束",
        description: "正在识别中...",
      });
    }
  };

  const imageAspectRatio = isMobile ? (3 / 3) : (3 / 2);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col items-center space-y-8">
        {/* Status Bar */}
        <div className="flex items-center justify-center gap-4">
          {isMarkedForReview && (
            <Badge variant="destructive">重点记忆</Badge>
          )}
          {isCorrect === true && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-4 w-4 mr-1" />
              正确
            </Badge>
          )}
          {isCorrect === false && (
            <Badge variant="destructive">
              <XCircle className="h-4 w-4 mr-1" />
              错误 ({attempts}/{maxAttempts})
            </Badge>
          )}
        </div>

        {/* Image with Navigation */}
        <div className="relative flex items-center justify-center w-full px-4 sm:max-w-4xl sm:mx-auto"> 
          {/* Previous Button */}
          <Button 
            variant="outline"
            size="icon"
            onClick={onPrevious}
            className="absolute left-0 sm:left-4 z-10 hover:bg-muted" 
            title="上一个单词"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>

          {/* Image Card */}
          <Card className="w-full sm:max-w-2xl sm:mx-16">
            <CardContent className="p-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-pulse bg-muted rounded-lg w-full h-48 mb-4"></div>
                    <p className="text-muted-foreground">加载图片中...</p>
                  </div>
                </div>
              ) : imageUrl ? (
                <AspectRatio ratio={imageAspectRatio} className="bg-muted overflow-hidden rounded-lg">
                  <img 
                    src={imageUrl} 
                    alt="单词图片"
                    onClick={randomNext}
                    className="object-contain w-full h-full cursor-pointer"
                  />
                </AspectRatio>
              ) : (
                <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                  <p className="text-muted-foreground">图片加载失败</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Button */}
          <Button 
            variant="outline"
            size="icon"
            onClick={onNext}
            className="absolute right-0 sm:right-4 z-10 hover:bg-muted"
            title="下一个单词"
          >
            <ArrowRight className="h-6 w-6" />
          </Button>
        </div>

        {/* NEW: "详细" button and details section */}
        <div className="w-full max-w-md flex flex-col items-center space-y-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="mt-4"
                disabled={isLoading}
            >
                <Info className="h-4 w-4 mr-2" />
                {showDetails ? '隐藏详细' : '显示详细'}
            </Button>

            {showDetails && (
                <div className="text-center p-3 bg-muted rounded-lg w-full max-w-sm animate-fade-in">
                    {wordData.phonetic && (
                        <p className="text-lg font-semibold text-gray-800 mb-1">
                            /{wordData.phonetic}/
                        </p>
                    )}
                    {wordData.meaning && (
                        <p className="text-base text-gray-700">
                            {wordData.meaning}
                        </p>
                    )}
                    {(!wordData.phonetic && !wordData.meaning) && (
                        <p className="text-sm text-muted-foreground">
                            暂无详细信息
                        </p>
                    )}
                </div>
            )}
        </div>


        {/* Input Section */}
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">请输入该图片对应的单词</p>
            <p className="text-sm text-muted-foreground">
              剩余尝试次数: {maxAttempts - attempts}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Input
              ref={answerInputRef} // Attach the ref to the Input component
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入单词..."
              disabled={isCorrect === true || attempts >= maxAttempts || isRecording} 
              className="flex-1"
            />
            <Button
              onClick={() => checkAnswer()}
              disabled={!userInput.trim() || isCorrect === true || attempts >= maxAttempts || isRecording} 
            >
              确认
            </Button>
          </div>

          {/* Hint after first wrong attempt */}
          {attempts > 0 && attempts < maxAttempts && !isCorrect && (
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                提示: 单词长度为 {wordData.word_text.length} 个字母
              </p>
            </div>
          )}
        </div>

        {/* Microphone Button for Mobile Only */}
        {isMobile && (
          speechRecognitionAvailable ? (
            <Button
              size="lg"
              className={`w-full max-w-xs h-16 rounded-full flex items-center justify-center space-x-2 text-lg font-bold mt-8
                ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary hover:bg-primary/90'}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <Mic className="h-8 w-8" />
              <span>{isRecording ? '正在录音...' : '按住说话'}</span>
            </Button>
          ) : (
            <p className="text-sm text-red-500 mt-4 text-center">
              抱歉，您的浏览器不支持语音输入功能。
            </p>
          )
        )}
      </div>
    </div>
  );
};

export default FlashcardMode;
