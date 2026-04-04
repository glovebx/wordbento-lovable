/// <reference types="@types/dom-speech-recognition" />

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, /*Mic,*/ Info } from 'lucide-react'; // Import Info icon for details
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { WordDataType } from '@/types/wordTypes';
import useIsTouchDevice from '@/hooks/use-is-touch-device';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import EnlargedImageCarouselDialog from '@/components/EnlargedImageCarouselDialog';
import DraggableButton from './DraggableButton';

interface FlashcardModeProps {
  wordData: WordDataType;
  onNext: () => void;
  onPrevious: () => void;
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({
  wordData,
  onNext,
  onPrevious,
}) => {
  const isTouchDevice = useIsTouchDevice();

  const [userInput, setUserInput] = useState('');
  const lastUserInputRef = useRef<string>('');
  const [attempts, setAttempts] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isMarkedForReview, setIsMarkedForReview] = useState(false);
  const { toast } = useToast();

  const [showEnlargedImageDialog, setShowEnlargedImageDialog] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const maxAttempts = 3;

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(false);

  const answerInputRef = useRef<HTMLInputElement>(null);

  const [showDetails, setShowDetails] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);  

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setShowEnlargedImageDialog(true);
  };

  // Effect to initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      // setSpeechRecognitionAvailable(true);

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; // Setting language to English (United States)

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        lastUserInputRef.current = transcript;
        setIsRecording(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
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
      // setSpeechRecognitionAvailable(false);
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

  // Effect for resetting state when word changes
  useEffect(() => {
    setIsCorrect(null);
    setIsMarkedForReview(false);
    setShowDetails(false);
    setIsSwitching(false);
  }, [wordData]);

  // Restore userInput from ref if it was unexpectedly cleared while answer marked correct
  useEffect(() => {
    if (userInput === '' && lastUserInputRef.current) {
      // restore previous input
      setUserInput(lastUserInputRef.current);
    }
  }, [userInput]);

  // --- New useEffect for Keyboard Navigation ---
  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
          const activeElement = document.activeElement;
          const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

          if (isTyping) {
              return;
          }

          if (event.key === 'v') {
              event.preventDefault();
              setShowDetails(prev => !prev);
          }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [setShowDetails]); // Dependencies: loading states and navigation handlers
  // --- End New useEffect for Keyboard Navigation ---  

  const checkAnswer = (valueToCheck: string = userInput) => {
    const isAnswerCorrect = valueToCheck.toLowerCase().trim() === wordData.word_text.toLowerCase();
    setIsCorrect(isAnswerCorrect);
    
    if (isAnswerCorrect) {
      lastUserInputRef.current = '';
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

  // const handleTouchStart = () => {
  //   if (speechRecognitionAvailable && recognitionRef.current && !isRecording) {
  //     setIsRecording(true);
  //     recognitionRef.current.start();
  //     toast({
  //       title: "开始录音",
  //       description: "请对着麦克风说话...",
  //     });
  //   } else if (!speechRecognitionAvailable) {
  //     toast({
  //       title: "不支持语音输入",
  //       description: "您的浏览器不支持Web Speech API，请尝试其他浏览器。",
  //       variant: "destructive",
  //     });
  //   }
  // };

  // const handleTouchEnd = () => {
  //   if (speechRecognitionAvailable && recognitionRef.current && isRecording) {
  //     recognitionRef.current.stop();
  //     toast({
  //       title: "录音结束",
  //       description: "正在识别中...",
  //     });
  //   }
  // };

  const imageAspectRatio = isTouchDevice ? (3 / 3) : (3 / 2);

  return (
    <>
      <div className="container mx-auto px-4 py-2 max-w-6xl">
        <div className="flex flex-col items-center space-y-6">
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
          <div className="relative flex items-center justify-center w-full px-4 lg:max-w-6xl sm:max-w-4xl sm:mx-auto"> 
          {/* Previous/Next Buttons for Desktop */}
          {!isTouchDevice && (
              <>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => {setIsSwitching(true); onPrevious();}}
                  className="absolute left-0 sm:left-4 z-10 hover:bg-muted" 
                  title="上一个单词"
                >
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => {setIsSwitching(true); onNext();}}
                  className="absolute right-0 sm:right-4 z-10 hover:bg-muted"
                  title="下一个单词"
                >
                  <ArrowRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Image Card */}
            <Card className="w-full lg:max-w-5xl sm:max-w-2xl sm:mx-16">
              <CardContent className="p-2">
                {isSwitching ? (
                  <AspectRatio ratio={imageAspectRatio} className="bg-muted rounded-lg">
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">加载中...</p>
                    </div>
                  </AspectRatio>
                ) : wordData.imageUrls && wordData.imageUrls.length > 0 ? (
                  <Carousel className="w-full">
                    <CarouselContent>
                      {wordData.imageUrls.map((url, index) => (
                        <CarouselItem key={index}>
                          <AspectRatio
                            ratio={imageAspectRatio}
                            className="bg-muted overflow-hidden rounded-lg cursor-pointer"
                            onClick={() => handleImageClick(index)}
                          >
                            <img 
                              src={url} 
                              alt={`${wordData.word_text} - Image ${index + 1}`}
                              loading="lazy"
                              decoding="async"
                              className="object-contain w-full h-full"
                            />
                          </AspectRatio>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {wordData.imageUrls.length > 1 && (
                      <>
                        <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                        <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
                      </>
                    )}
                  </Carousel>
                ) : (
                  <AspectRatio ratio={imageAspectRatio} className="bg-muted rounded-lg">
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">无可用图片</p>
                    </div>
                  </AspectRatio>
                )}
              </CardContent>
            </Card>
          </div>

          {/* NEW: "详细" button and details section */}
          <div className="w-full max-w-md flex flex-col items-center space-y-4">
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="mt-4"
              >
                  <Info className="h-4 w-4 mr-2" />
                  {showDetails ? '隐藏详细' : '显示详细'}
              </Button>

              <div className="text-center p-3 bg-muted rounded-lg w-full max-w-sm animate-fade-in">
                  {wordData.phonetic && (
                      <p className="text-lg font-semibold text-foreground mb-1">
                          /{wordData.phonetic}/
                      </p>
                  )}
                {showDetails && (
                    <div>
                        {wordData.meaning && (
                            <p className="text-base text-muted-foreground">
                                {wordData.meaning}
                            </p>
                        )}
                        {(!wordData.meaning) && (
                            <p className="text-sm text-muted-foreground">
                                暂无详细信息
                            </p>
                        )}
                    </div>
                )}
              </div>            
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
                onChange={(e) => { setUserInput(e.target.value); lastUserInputRef.current = e.target.value; }}
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
          {/* {isMobile && (
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
          )} */}
        </div>

        {/* Enlarged Image Dialog */}
        {showEnlargedImageDialog && (
          <EnlargedImageCarouselDialog
            open={showEnlargedImageDialog}
            onOpenChange={setShowEnlargedImageDialog}
            imageUrls={wordData.imageUrls || []}
            wordText={wordData.word_text}
            initialIndex={selectedImageIndex}/>
          )}
      </div>

      {/* Draggable Buttons for Mobile */}
      {isTouchDevice && (
        <>
          <DraggableButton
            storageKey="prev-button-pos"
            initialPosition={{ x: 20, y: window.innerHeight / 2 - 30 }}
            onClick={() => {setIsSwitching(true); onPrevious();}}
          >
            <ArrowLeft className="h-6 w-6" />
          </DraggableButton>
          <DraggableButton
            storageKey="next-button-pos"
            initialPosition={{ x: window.innerWidth - 80, y: window.innerHeight / 2 - 30 }}
            onClick={() => {setIsSwitching(true); onNext();}}
          >
            <ArrowRight className="h-6 w-6" />
          </DraggableButton>
        </>
      )}
    </>
  );
};

export default FlashcardMode;
