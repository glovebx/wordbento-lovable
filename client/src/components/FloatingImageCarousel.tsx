import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
// import { useWordImages } from '@/hooks/use-word-images'; // Import the new hook
import { useGenerateImages } from '@/hooks/use-generate-images'; // Adjust path as needed

interface FloatingImageCarouselProps {
  wordText: string; // The word for which to display images
  position: { top: number; left: number; width: number; height: number; }; // Position of the clicked word
  onClose: () => void; // Callback to close the carousel
}

const FloatingImageCarousel: React.FC<FloatingImageCarouselProps> = ({
  wordText,
  position,
  onClose,
}) => {
  const { isAuthenticated } = useAuth();  
  const [showAuthModal, setShowAuthModal] = useState(false);

//   const { imageUrls, isLoading, error, refetchImages } = useWordImages(wordText);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

    // Use the useGenerateImages hook internally
    const { generateImages, isGeneratingImages, generationError } = useGenerateImages();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);


  useEffect(() => {
    if (!isAuthenticated) {
      // If user is not authenticated, trigger the login prompt
      setShowAuthModal(true);
      return; // Stop here, wait for login
    }

    const fetchImageUrls = async (wordText: string) => {
        try {
            const generatedUrls = await generateImages(wordText, '');
            if (generatedUrls && generatedUrls.length > 0) {
                // setImageUrls(generatedUrls.map(img => img.url));
                setImageUrls(generatedUrls);
            } else {
                setImageUrls([]);
            }
            
        } catch (error) {
            console.error('Failed to fetch session:', error);
            setImageUrls([]);
        }
    };

    fetchImageUrls(wordText);
  }, [isAuthenticated, generateImages, wordText]);

  // Reset current image index when wordText changes or images are re-fetched
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [imageUrls]); // imageUrls as a dependency ensures reset when images are loaded/reloaded

  // Handle carousel navigation
  const handlePrevious = useCallback(() => {
    setCurrentImageIndex((prevIndex) => (prevIndex === 0 ? imageUrls.length - 1 : prevIndex - 1));
  }, [imageUrls.length]);

  const handleNext = useCallback(() => {
    setCurrentImageIndex((prevIndex) => (prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1));
  }, [imageUrls.length]);

  // Calculate dynamic style for positioning
  // Position the carousel above the clicked word, centered horizontally
  const carouselWidth = 320; // Fixed width for the carousel (adjust as needed)
  const carouselHeight = 200; // Fixed height for the carousel (adjust as needed)

  // Calculate top position: rect.top - carouselHeight - some_margin
  // Calculate left position: rect.left + rect.width / 2 - carouselWidth / 2
  const topPosition = position.top - carouselHeight - 20; // 20px margin above the word
  const leftPosition = position.left + (position.width / 2) - (carouselWidth / 2);

  return (
    <div
      className="fixed z-[100] bg-gray-900 bg-opacity-95 rounded-lg shadow-2xl p-2 flex flex-col items-center justify-center"
      style={{
        top: `${topPosition}px`,
        left: `${leftPosition}px`,
        width: `${carouselWidth}px`,
        height: `${carouselHeight}px`,
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-1 right-1 text-white hover:bg-gray-700"
      >
        <X className="h-5 w-5" />
      </Button>

      {isGeneratingImages ? (
        <div className="flex flex-col items-center justify-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p>生成图片中...</p>
        </div>
      ) : imageUrls.length > 0 ? (
        <Carousel className="w-full h-full max-w-xs mx-auto">
          <CarouselContent className="h-full">
            {imageUrls.map((url, index) => (
              <CarouselItem key={index} className="h-full flex items-center justify-center">
                <AspectRatio ratio={16/9} className="w-full h-full">
                  <img
                    src={url}
                    alt={`${wordText} image ${index + 1}`}
                    className="object-contain w-full h-full rounded-md"
                  />
                </AspectRatio>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-1 top-1/2 -translate-y-1/2 text-white hover:bg-gray-700" onClick={handlePrevious} />
          <CarouselNext className="absolute right-1 top-1/2 -translate-y-1/2 text-white hover:bg-gray-700" onClick={handleNext} />
        </Carousel>
      ) : (
        <div className="flex flex-col items-center justify-center text-white text-center p-4">
          <p className="mb-2">暂无图片。</p>
          {/* {error && <p className="text-red-400 text-sm mb-2">{error.message}</p>}
          <Button onClick={() => refetchImages(wordText)} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "生成图片"}
          </Button> */}
        </div>
      )}

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {}}
      />         
    </div>
  );
};

export default FloatingImageCarousel;
