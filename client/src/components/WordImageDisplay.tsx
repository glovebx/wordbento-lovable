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

// Import the useGenerateImages hook
import { useGenerateImages } from '@/hooks/use-generate-images';
import { WordDataType } from '@/types/wordTypes';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react'; // Only Loader2 needed here for the main component

// Import the new enlarged image carousel dialog component
import EnlargedImageCarouselDialog from '@/components/EnlargedImageCarouselDialog';

interface WordImageDisplayProps {
  initialImageUrls: string[];
  word: WordDataType;
  isWordLoading: boolean;
  onImagesGenerated: (word: string) => void;
  onShowImageDialogChange?: (isOpen: boolean) => void;
  onShowExampleDialogChange?: (isOpen: boolean) => void;
}

const WordImageDisplay: React.FC<WordImageDisplayProps> = ({ 
  initialImageUrls, 
  word,
  isWordLoading,
  onImagesGenerated,
  onShowImageDialogChange,
  onShowExampleDialogChange,
}) => {
  // State to control the visibility of the ENLARGED image dialog
  const [showEnlargedImageDialog, setShowEnlargedImageDialog] = useState(false);
  // State to store the index of the image clicked in the small carousel
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  // State to manage the image URLs displayed in the carousel
  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls || []);

  const { isAuthenticated } = useAuth();  
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Use the useGenerateImages hook internally
  const { generateImages, isGeneratingImages, generationError } = useGenerateImages();

  // State for the new example selection dialog
  const [showExampleDialog, setShowExampleDialog] = useState(false);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

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
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const examples = word?.content?.examples?.en;
    if (examples && Array.isArray(examples) && examples.length > 0) {
      if (!selectedExample) {
        setSelectedExample(examples[0]);
      }
      setShowExampleDialog(true);
    } else {
      console.log("No examples found or examples not in expected array format, generating image with word only.");
      const generatedUrls = await generateImages(word.word_text, '', true);
      if (generatedUrls && generatedUrls.length > 0) {
        onImagesGenerated(word.word_text);
        setImageUrls(generatedUrls);
      }
    }        
  }, [isAuthenticated, generateImages, word, selectedExample, onImagesGenerated]);


  // Handler when an example is selected in the dialog and confirmed
  const handleExampleSelected = useCallback(async () => {
      if (!selectedExample) {
          console.warn("No example selected.");
          return;
      }

      setShowExampleDialog(false); // Close the example selection dialog
      setSelectedExample(null); // Reset selected example state

      console.log(`Generating image for word "${word.word_text}" with example: "${selectedExample}"`);

      const generatedUrls = await generateImages(word.word_text, selectedExample, true);

      if (generatedUrls && generatedUrls.length > 0) {
        onImagesGenerated(word.word_text);
        setImageUrls(generatedUrls);
      }
  }, [generateImages, word, selectedExample, onImagesGenerated]);


  // Determine if we should show the "Generate Images" button
  // const showGenerateButton = (!imageUrls || imageUrls.length === 0) && !isGeneratingImages;
  // 即梦失效的图片格式：https://p23..., https://p26..., https://p9...
  const hasHttpsJimengImages = (imageUrls && imageUrls.length > 0 && imageUrls.filter(img => img.startsWith('https://p')).length > 0);
  // 部分图片出错了，需要重新生成，暂时放开
  const showGenerateButton = ((!imageUrls || imageUrls.length === 0) || hasHttpsJimengImages) && !isGeneratingImages;
  // Determine if we should show the small Carousel
  const showSmallCarousel = imageUrls && imageUrls.length > 0;

  // Get English examples for the dialog
  const englishExamples = word?.content?.examples?.en || [];

  return (
    <>
      {/* Conditional Rendering based on state */}
      {showGenerateButton && (
        <div className="text-center my-8">
          <Button onClick={handleGenerateButtonClick} disabled={isGeneratingImages || isWordLoading}>
            {isGeneratingImages ? (
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

      {isGeneratingImages && !showSmallCarousel && (
        <GeneratingFallback message="" />        
      )}

       {/* Optional: Display generation error if any */}
       {generationError && !isGeneratingImages && (
           <div className="text-center my-8 text-red-600">
               <p>图片生成失败: {generationError.message}</p>
           </div>
       )}

      {/* Small Image Carousel Section */}
      {showSmallCarousel && (
        <div className="max-w-lg mx-auto mb-8">
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
                      />
                    </AspectRatio>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 export-hide" />
            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 export-hide" />
          </Carousel>
        </div>
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
          <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                  <DialogTitle>选择一个例句生成图片</DialogTitle>
              </DialogHeader>
              {englishExamples && Array.isArray(englishExamples) && englishExamples.length > 0 ? (
                  <RadioGroup onValueChange={setSelectedExample} value={selectedExample || undefined} className="max-h-[300px] overflow-y-auto pr-4">
                      {englishExamples.map((example: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                              <RadioGroupItem value={example} id={`example-${index}`} />
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
                      disabled={!selectedExample || isGeneratingImages}
                  >
                      {isGeneratingImages ? (
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
