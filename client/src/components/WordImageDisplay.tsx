import React, { useState, useEffect, useCallback } from 'react';

// Import Dialog components (only for ExampleSelectionDialog now, not the image dialog)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// Import the Carousel components for the small display carousel
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

// Import RadioGroup components for the example selection dialog
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

import GeneratingFallback from '@/components/GeneratingFallback';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
import { WordDataType } from '@/types/wordTypes';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react'; // Only Loader2 needed here for the main component
import useIsTouchDevice from '@/hooks/use-is-touch-device';
import DraggableButton from './DraggableButton';

// Import the new enlarged image carousel dialog component
import EnlargedImageCarouselDialog from '@/components/EnlargedImageCarouselDialog';

interface WordImageDisplayProps {
  initialImageUrls: string[];
  word: WordDataType;
  isWordLoading: boolean;
  onImagesGenerated: (word: string) => void;
  onShowImageDialogChange?: (isOpen: boolean) => void;
  onShowExampleDialogChange?: (isOpen: boolean) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  /**
   * 外部触发生成图片的请求处理器（上层容器应执行生成并通过 `generatedImageUrls` 回传结果）
   */
  requestGenerateImages?: (word: string, example: string, force: boolean) => void;
  /**
   * 由上层容器传入的已生成图片 URL 列表
   */
  generatedImageUrls?: string[];
  /**
   * 上层容器是否正在生成图片（用于禁用按钮和显示 loading）
   */
  isGenerating?: boolean;
  /**
   * 上层容器的生成错误信息（可选）
   */
  generationError?: { message?: string } | null;
}

const WordImageDisplay: React.FC<WordImageDisplayProps> = ({ 
  initialImageUrls, 
  word,
  isWordLoading,
  onImagesGenerated,
  onShowImageDialogChange,
  onShowExampleDialogChange,
  requestGenerateImages,
  generatedImageUrls,
  isGenerating,
  generationError,
  onNext,
  onPrevious,
}) => {
  const isTouchDevice = useIsTouchDevice();
  // Get English examples for the dialog
  const englishExamples = word?.content?.examples?.en || [];
  // State to control the visibility of the ENLARGED image dialog
  const [showEnlargedImageDialog, setShowEnlargedImageDialog] = useState(false);
  // State to store the index of the image clicked in the small carousel
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  // State to manage the image URLs displayed in the carousel
  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls || []);

  const { isAuthenticated } = useAuth();  
  const [showAuthModal, setShowAuthModal] = useState(false);


  // State for the new example selection dialog
  const [showExampleDialog, setShowExampleDialog] = useState(false);
  const [selectedExampleIndex, setSelectedExampleIndex] = useState<number | null>(null);

  // Effect to update internal imageUrls state when initialImageUrls prop changes
  useEffect(() => {
    setImageUrls(initialImageUrls || []);
    // Reset selected image index when new initial images are provided
    setSelectedImageIndex(null);
  }, [initialImageUrls]);

  // --- Effects to report dialog state changes ---
  // Now reports the state of the NEW enlarged image dialog
  useEffect(() => {
      if (onShowImageDialogChange) {
          onShowImageDialogChange(showEnlargedImageDialog);
      }
  }, [showEnlargedImageDialog, onShowImageDialogChange]);

  useEffect(() => {
      if (onShowExampleDialogChange) {
          onShowExampleDialogChange(showExampleDialog);
      }
  }, [showExampleDialog, onShowExampleDialogChange]);
  // --- End Effects ---
    
  // Handler to open the enlarged image dialog and set the selected image index
  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index); // Set the index of the image to display in the dialog
    setShowEnlargedImageDialog(true); // Open the enlarged dialog
  }, []);

  // Handler for the "Generate Images" button click
  const handleGenerateButtonClick = useCallback(async () => {
    console.log('handleGenerateButtonClick-1');
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    console.log('handleGenerateButtonClick-2');

    const examples = word?.content?.examples?.en;
    if (examples && Array.isArray(examples) && examples.length > 0) {
      console.log('handleGenerateButtonClick - 3');
      if (selectedExampleIndex === null) {
        setSelectedExampleIndex(0); // Default to the first example
        console.log('handleGenerateButtonClick - 5');
      }
      setShowExampleDialog(true);
      console.log('handleGenerateButtonClick - 6');
    } else {
      console.log('handleGenerateButtonClick - 4');
      // console.log("No examples found or examples not in expected array format, generating image with word only.");
      if (typeof requestGenerateImages === 'function') {
        requestGenerateImages(word.word_text, '', true);
      }
    }        
    console.log('handleGenerateButtonClick - 9');
  }, [isAuthenticated, requestGenerateImages, word, selectedExampleIndex, onImagesGenerated]);


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
        requestGenerateImages(word.word_text, example, true);
      }
      
      setSelectedExampleIndex(null); // Reset selected example state after using it
  }, [requestGenerateImages, word, selectedExampleIndex, englishExamples]);

  // When parent passes generatedImageUrls, update internal imageUrls and notify via onImagesGenerated
  useEffect(() => {
    if (generatedImageUrls && Array.isArray(generatedImageUrls) && generatedImageUrls.length > 0) {
      // console.log(generatedImageUrls);
      
      setImageUrls(generatedImageUrls);
      onImagesGenerated(word.word_text);
    }
  }, [generatedImageUrls, onImagesGenerated, word]);


  // Determine if we should show the "Generate Images" button
  // const showGenerateButton = (!imageUrls || imageUrls.length === 0) && !isGenerating;
  // 即梦失效的图片格式：https://p23..., https://p26..., https://p9...
  const hasHttpsJimengImages = (imageUrls && imageUrls.length > 0 && imageUrls.filter(img => img.startsWith('https://p')).length > 0);
  // 部分图片出错了，需要重新生成，暂时放开
  const showGenerateButton = ((!imageUrls || imageUrls.length === 0) || hasHttpsJimengImages) && !isGenerating;
  // const showGenerateButton = true;
  // Determine if we should show the small Carousel
  const showSmallCarousel = imageUrls && imageUrls.length > 0;



  return (
    <>
      {/* Conditional Rendering based on state */}
      {showGenerateButton && (
        <div className="text-center my-8">
          <Button onClick={handleGenerateButtonClick} disabled={isGenerating || isWordLoading}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中... 
              </>
            ) : (
              "生成图片"
            )}
          </Button>
        </div>
      )}

      {isGenerating && !showSmallCarousel && (
        <GeneratingFallback message="" />        
      )}

       {/* Optional: Display generation error if any */}
       {generationError && !isGenerating && (
           <div className="text-center my-8 text-red-600">
               <p>图片生成失败: {generationError.message}</p>
           </div>
       )}

      {/* Small Image Carousel Section */}
      {showSmallCarousel && (
        <div className="max-w-lg mx-auto mb-8 relative">
          <Carousel className="w-full">
            <CarouselContent>
              {imageUrls.map((url, index) => (
                <CarouselItem key={index} className="export-carousel-item">
                  <div
                    onClick={() => handleImageClick(index)} // Click to open enlarged dialog
                    className="cursor-pointer rounded-md overflow-hidden transition-opacity hover:opacity-80 export-image"
                  >
                    <AspectRatio ratio={16/9} className="bg-muted">
                      <img
                        src={url}
                        alt={`Image ${index + 1} representing the word "${word.word_text}"`}
                        className="object-cover w-full h-full"
                        loading="lazy"
                        decoding="async"                        
                      />
                    </AspectRatio>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {imageUrls.length > 1 && (
              <>
                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
              </>
            )}
          </Carousel>
        </div>
      )}

      {isTouchDevice && onNext && onPrevious && (
        <>
          <DraggableButton
            storageKey="prev-word-pos"
            initialPosition={{ x: 20, y: window.innerHeight / 2 - 30 }}
            onClick={onPrevious}
          >
            <ArrowLeft className="h-6 w-6" />
          </DraggableButton>
          <DraggableButton
            storageKey="next-word-pos"
            initialPosition={{ x: window.innerWidth - 80, y: window.innerHeight / 2 - 30 }}
            onClick={onNext}
          >
            <ArrowRight className="h-6 w-6" />
          </DraggableButton>
        </>
      )}

      {/* Enlarged Image Dialog - now a separate component */}
      {showEnlargedImageDialog && (
        <EnlargedImageCarouselDialog
          open={showEnlargedImageDialog}
          onOpenChange={setShowEnlargedImageDialog} // Pass the state setter to control dialog visibility
          imageUrls={imageUrls}
          wordText={word.word_text}
          initialIndex={selectedImageIndex}
        />
      )}

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
                      disabled={selectedExampleIndex === null || isGenerating}
                    >
                      {isGenerating ? (
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

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {}}
      />      
    </>
  );
};

export default WordImageDisplay;
