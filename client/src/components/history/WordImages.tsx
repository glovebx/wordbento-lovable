import React, { useState, useEffect, useCallback } from 'react';
import { axiosPrivate } from '@/lib/axios';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { AspectRatio } from '@/components/ui/aspect-ratio';
import LoadingFallback from '@/components/LoadingFallback';
import { WordDataType } from '@/types/wordTypes';
import EnlargedImageCarouselDialog from '@/components/EnlargedImageCarouselDialog';

interface WordImagesProps {
  wordText: string;
}

const WordImages: React.FC<WordImagesProps> = ({ wordText }) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showEnlargedImageDialog, setShowEnlargedImageDialog] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      if (!wordText) return;

      setIsLoading(true);
      setError(null);
      try {
        const response = await axiosPrivate.post<WordDataType>('/api/word/search', { slug: wordText });
        const images = response.data.imageUrls || [];
        setImageUrls(images);
      } catch (err) {
        setError('Failed to load images.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [wordText]);

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
    setShowEnlargedImageDialog(true);
  }, []);

  if (isLoading) {
    return <LoadingFallback message="Loading images..." />;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  if (imageUrls.length === 0) {
    return <div className="text-muted-foreground text-center p-4">No images found for this word.</div>;
  }

  return (
    <>
      <div className="max-w-md mx-auto p-4">
        <Carousel className="w-full">
          <CarouselContent>
            {imageUrls.map((url, index) => (
              <CarouselItem key={index}>
                <div 
                  className="rounded-md overflow-hidden cursor-pointer transition-opacity hover:opacity-80"
                  onClick={() => handleImageClick(index)}
                >
                  <AspectRatio ratio={16 / 9} className="bg-muted">
                    <img
                      src={url}
                      alt={`Image for ${wordText} ${index + 1}`}
                      className="object-cover w-full h-full"
                      loading="lazy"
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

      {showEnlargedImageDialog && (
        <EnlargedImageCarouselDialog
          open={showEnlargedImageDialog}
          onOpenChange={setShowEnlargedImageDialog}
          imageUrls={imageUrls}
          wordText={wordText}
          initialIndex={selectedImageIndex}
        />
      )}
    </>
  );
};

export default WordImages;
