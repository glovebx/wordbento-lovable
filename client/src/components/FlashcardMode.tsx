/// <reference types="@types/dom-speech-recognition" />

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, /*Mic,*/ Info, Loader2, Send, Share2, Star, ImagePlus } from 'lucide-react'; // Import Info icon for details
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useToast } from '@/components/ui/use-toast';
import { WordDataType } from '@/types/wordTypes';
import useIsTouchDevice from '@/hooks/use-is-touch-device';
import { axiosPrivate, baseURL } from '@/lib/axios';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { CarouselApi } from '@/components/ui/carousel'; // 类型导入

import EnlargedImageCarouselDialog from '@/components/EnlargedImageCarouselDialog';
import DraggableButton from './DraggableButton';

import { useEinkStatus } from '@/hooks/use-llm';
import { useEinkPusher } from '@/hooks/use-eink-pusher';
import useAuth from '@/hooks/auth/use-auth';

interface FlashcardModeProps {
  wordData: WordDataType;
  onNext: () => void;
  onPrevious: () => void;
  onShowImageDialogChange?: (isOpen: boolean) => void;
  onUpdateWordCover: (wordText: string, cover: { image_key: string } | null) => void;
  requestGenerateImages: (word: string, example: string, force: boolean) => void;
  /**
   * 上层容器是否正在生成图片（用于禁用按钮和显示 loading）
   */
  isImageGenerating?: boolean;
  /**
   * 上层容器的生成错误信息（可选）
   */
  imageGenerationError?: { message?: string } | null;  
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({
  wordData,
  onNext,
  onPrevious,
  onShowImageDialogChange,
  onUpdateWordCover,
  requestGenerateImages,
  isImageGenerating,
  imageGenerationError,  
}) => {
  const isTouchDevice = useIsTouchDevice();
  const { isEinkConfigured, einkEndpoint, einkToken, isLoadingEinkStatus } = useEinkStatus(true);
  const { isPushing, pushImage } = useEinkPusher({ einkEndpoint, einkToken });
  const { user } = useAuth();

  // Get English examples for the dialog
  const englishExamples = wordData?.content?.examples?.en || [];

  const [userInput, setUserInput] = useState('');
  const lastUserInputRef = useRef<string>('');
  const [attempts, setAttempts] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  // const [isMarkedForReview, setIsMarkedForReview] = useState(false);
  const { toast } = useToast();
  const [isSettingCover, setIsSettingCover] = useState(false);

  // State for the new example selection dialog
  const [showExampleDialog, setShowExampleDialog] = useState(false);
  const [selectedExampleIndex, setSelectedExampleIndex] = useState<number | null>(null);

  const handleSetCover = async () => {
    const imageIndex = selectedImageIndex ?? 0;
    const imageUrl = wordData.imageUrls?.[imageIndex];
    if (!imageUrl || !wordData.id) return;

    setIsSettingCover(true);
    try {
      // Extract image_key from URL (last path segment)
      const imageKey = imageUrl.split('/').pop();
      await axiosPrivate.post('/api/word/cover', {
        word_id: wordData.id,
        image_key: imageKey,
      });
      toast({
        title: '已设为封面',
        description: '该图片已设为封面图片',
      });
      const cover = wordData.cover 
        ? { ...wordData.cover, image_key: imageKey ?? '' }
        : { image_key: imageKey ?? '' }
      onUpdateWordCover(wordData.word_text, cover)
    } catch (error) {
      console.error('Failed to set cover image:', error);
      toast({
        title: '设置失败',
        description: '设置封面图片时发生错误',
        variant: 'destructive',
      });
    } finally {
      setIsSettingCover(false);
    }
  };

  // Handler for the "Generate Images" button click
  const handleGenerateButtonClick = useCallback(async () => {
    // const examples = wordData?.content?.examples?.en || [];
    if (englishExamples.length > 0) {
      if (selectedExampleIndex === null) {
        setSelectedExampleIndex(0); // Default to the first example
      }
      setShowExampleDialog(true);
    } else {
      // console.log("No examples found or examples not in expected array format, generating image with word only.");
      if (typeof requestGenerateImages === 'function') {
        requestGenerateImages(wordData.word_text, '', true);
      }
    }
  }, [requestGenerateImages, wordData.word_text, englishExamples, selectedExampleIndex]);

  // Handler when an example is selected in the dialog and confirmed
  const handleExampleSelected = useCallback(async () => {
    if (selectedExampleIndex === null) {
      console.warn("No example selected.");
      return;
    }
    const example = englishExamples[selectedExampleIndex];
    if (!example) {
      console.error("Selected example index is out of bounds.");
      return;
    }

    setShowExampleDialog(false); // Close the example selection dialog

    if (typeof requestGenerateImages === 'function') {
      requestGenerateImages(wordData.word_text, example, true);
    }

    setSelectedExampleIndex(null); // Reset selected example state after using it
  }, [requestGenerateImages, wordData.word_text, selectedExampleIndex, englishExamples]); 

  const handleShare = async () => {
    const imageIndex = selectedImageIndex ?? 0;
    const imageUrl = wordData.imageUrls?.[imageIndex];
    if (!imageUrl) return;

    try {
      // Load images
      const imageKey = imageUrl.split('/').pop();
      const [img, qrImg] = await Promise.all([
        loadImage(`${baseURL}/api/word/image/${imageKey}`),
        loadImage('/alex-qr.jpg'),
      ]);

      // Create canvas and compose
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Draw QR code on bottom-right with padding
      const qrSize = Math.min(img.width, img.height) * 0.2;
      const padding = Math.round(Math.min(img.width, img.height) * 0.02);
      const qrX = img.width - qrSize - padding;
      const qrY = img.height - qrSize - padding;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/jpeg', 0.9);
      });

      const file = new File([blob], `${wordData.word_text}.jpg`, { type: 'image/jpeg' });

      try {
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: wordData.word_text,
            text: wordData.meaning || wordData.word_text,
            files: [file],
          });
          return;
        } 
      } catch (err) {
        console.error('Share failed:', err);
      }
      // // System share
      // if (navigator.share && navigator.canShare?.({ files: [file] })) {
      //   await navigator.share({
      //     title: wordData.word_text,
      //     text: wordData.meaning || wordData.word_text,
      //     files: [file],
      //   });
      // } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${wordData.word_text}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        toast({
          title: '已保存到本地',
          description: '您的浏览器不支持系统分享功能，已保存到本地相册',
        });
      // }
    } catch (error) {
      console.error('Share failed:', error);
      toast({
        title: '分享失败',
        description: '生成分享图片时发生错误',
        variant: 'destructive',
      });
    }
  };

  // Helper to load image with CORS support
  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  const handlePushToEink = () => {
    const imageIndexToPush = selectedImageIndex ?? 0;
    const imageUrl = wordData.imageUrls?.[imageIndexToPush];
    pushImage(imageUrl);
  };

  const [showEnlargedImageDialog, setShowEnlargedImageDialog] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  // 在你的组件中
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const apiRef = useRef<CarouselApi | null>(null);  // 关键：使用 ref 保持最新值

  // 同步 ref 和 state
  useEffect(() => {
    apiRef.current = carouselApi;
    if (!carouselApi) return;

    const onSelect = () => {
      setSelectedImageIndex(carouselApi.selectedScrollSnap());
    };

    carouselApi.on('select', onSelect);

  }, [carouselApi]);

  // 控制方法 - 始终读取 ref 的最新值
  const scrollNext = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;

    if (api.canScrollNext()) {
      api.scrollNext();
    } else {
      // 已经是最后一张，回到第一张
      api.scrollTo(0);
    }
  }, []);  // 空依赖数组，不会重新创建

  // --- Effects to report dialog state changes ---
  // Now reports the state of the NEW enlarged image dialog
  useEffect(() => {
    if (onShowImageDialogChange) {
      onShowImageDialogChange(showEnlargedImageDialog);
    }
  }, [showEnlargedImageDialog, onShowImageDialogChange]);

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
    // setIsMarkedForReview(false);
    setShowDetails(false);
    setIsSwitching(false);
    setUserInput('');
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
          else if (event.key === 'n') {
              event.preventDefault();
              // 相当于点击CarouselNext
              scrollNext();
          }
          else if (event.key === 'z') {
              event.preventDefault();
              setShowEnlargedImageDialog(!showEnlargedImageDialog);
          }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [setShowDetails, scrollNext, setShowEnlargedImageDialog, showEnlargedImageDialog]); // Dependencies: loading states and navigation handlers
  // --- End New useEffect for Keyboard Navigation ---  

  const checkAnswer = (valueToCheck: string = userInput) => {
    const isAnswerCorrect = valueToCheck.toLowerCase().trim() === wordData.word_text.toLowerCase();
    setIsCorrect(isAnswerCorrect);
    
    if (isAnswerCorrect) {
      lastUserInputRef.current = '';
      // toast({
      //   title: "回答正确！",
      //   description: "自动切换到下一个单词",
      // });
      
      setTimeout(() => {
        onNext();
      }, 1500);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= maxAttempts) {
        // setIsMarkedForReview(true);
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

  const imageAspectRatio = isTouchDevice ? (3 / 4) : (3 / 2);

  // Derive current image key and check if it's the cover
  const currentImageKey = wordData.imageUrls?.[selectedImageIndex ?? 0]?.split('/').pop();
  const isCoverImage = !!(wordData.cover?.image_key && currentImageKey && wordData.cover.image_key === currentImageKey);

  return (
    <>
      <div className="container mx-auto px-4 py-2 max-w-6xl">
        <div className="flex flex-col items-center space-y-6">
          {/* Status Bar */}
          {/* <div className="flex items-center justify-center gap-4">
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
          </div> */}

          {/* Image with Navigation */}
          <div className="relative flex items-center justify-center w-full px-0 sm:px-2 lg:max-w-6xl sm:max-w-4xl sm:mx-auto"> 
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
                  <Carousel className="w-full"
                            setApi={setCarouselApi}>
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
            <div className="flex space-x-2 mt-4">
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
              >
                  <Info className="h-4 w-4 mr-2" />
                  {showDetails ? '隐藏详细' : '显示详细'}
              </Button>
              {wordData.imageUrls && wordData.imageUrls.length > 0 && user?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetCover}
                  disabled={isSettingCover || isCoverImage}
                >
                  {isSettingCover ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Star className={`mr-2 h-4 w-4 ${isCoverImage ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  )}
                  {isSettingCover ? '设置中...' : isCoverImage ? '封面图片' : '设为封面'}
                </Button>
              )}
              {user?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateButtonClick}
                  disabled={isImageGenerating}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  重新生图
                </Button>
              )}              
              {isTouchDevice && wordData.imageUrls && wordData.imageUrls.length > 0 && user?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  分享
                </Button>
              )}
              {isEinkConfigured && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePushToEink}
                  disabled={isLoadingEinkStatus || !isEinkConfigured || !wordData.imageUrls || wordData.imageUrls.length === 0 || isPushing}
                >
                {isPushing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                  {isPushing ? '推送中...' : '推送'}
                </Button>
              )}
            </div>

      {imageGenerationError && !isImageGenerating && (
        <div className="text-center my-8 text-red-600">
          <p>图片生成失败: {imageGenerationError.message}</p>
        </div>
      )}

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

      {/* Example Selection Dialog */}
      <Dialog open={showExampleDialog} onOpenChange={setShowExampleDialog}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>选择一个例句生成图片</DialogTitle>
          </DialogHeader>
          {englishExamples && Array.isArray(englishExamples) && englishExamples.length > 0 ? (
            <RadioGroup
              onValueChange={(value) => setSelectedExampleIndex(Number(value))}
              value={selectedExampleIndex !== null ? String(selectedExampleIndex) : undefined}
              className="max-h-[300px] overflow-y-auto pr-4"
            >
              {englishExamples.map((example: string, index: number) => (
                <div key={index} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-400 cursor-pointer">
                  <RadioGroupItem value={String(index)} id={`example-${index}`} />
                  <Label htmlFor={`example-${index}`} className="cursor-pointer text-base font-normal leading-relaxed">
                    {example}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <p className="text-center text-gray-500">没有找到英文例句。</p>
          )}
          <DialogFooter>
            <Button
              onClick={handleExampleSelected}
              disabled={selectedExampleIndex === null || isImageGenerating}
            >
              {isImageGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                "确定"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Enlarged Image Dialog */}
        {showEnlargedImageDialog && (
          <EnlargedImageCarouselDialog
            open={showEnlargedImageDialog}
            onOpenChange={setShowEnlargedImageDialog}
            imageUrls={wordData.imageUrls || []}
            wordText={wordData.word_text}
            initialIndex={selectedImageIndex}
            onNextWord={onNext}
            onPreviousWord={onPrevious}/>
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
