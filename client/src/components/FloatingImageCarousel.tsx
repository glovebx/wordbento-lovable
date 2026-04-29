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
import AuthModal from './AuthModal';
import { useGenerateImages } from '@/hooks/use-generate-images';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Define CarouselApi type for internal use
type CarouselApi = any;

interface FloatingImageCarouselProps {
  wordText: string;
  position: { top: number; left: number; width: number; height: number; };
  onClose: () => void;
}

const FloatingImageCarousel: React.FC<FloatingImageCarouselProps> = ({
  wordText,
  position,
  onClose,
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showEnlargedDialog, setShowEnlargedDialog] = useState(false);
  const [enlargedImageIndex, setEnlargedImageIndex] = useState<number | null>(null);

  const { generateImages, isGeneratingImages } = useGenerateImages();

  const fetchAndSetImages = useCallback(async (force = false) => {
    setIsLoading(true);
    setImageUrls([]);
    try {
      const urls = await generateImages(wordText, '', force);
      if (urls && urls.length > 0) {
        setImageUrls(urls);
      }
    } catch (error) {
      console.error(`Failed to ${force ? 'generate' : 'fetch'} images:`, error);
      // In case of initial fetch failure, we close the component.
      if (!force) onClose();
    } finally {
      setIsLoading(false);
    }
  }, [wordText, generateImages, onClose]);

  useEffect(() => {
    fetchAndSetImages(false); // Initial fetch, don't force generation
  }, [fetchAndSetImages]);

  // Handle click on the generate button
  const handleGenerateClick = () => {
    fetchAndSetImages(true); // Force generation
  };

  // Handle image click to open the enlarged view
  const handleImageClick = useCallback((index: number) => {
    setEnlargedImageIndex(index);
    setShowEnlargedDialog(true);
  }, []);

  // ... (position calculation logic remains the same) ...
  const carouselWidth = 320;
  const carouselHeight = 200;
  const margin = 20;

  let calculatedTop = 0;
  let calculatedLeft = 0;

  const potentialTopAbove = position.top - carouselHeight - margin;
  if (potentialTopAbove < 0) {
    calculatedTop = position.top + position.height + margin;
  } else {
    calculatedTop = potentialTopAbove;
  }

  const viewportHeight = window.innerHeight;
  if (calculatedTop + carouselHeight > viewportHeight) {
    calculatedTop = viewportHeight - carouselHeight - margin;
    if (calculatedTop < 0) {
        calculatedTop = margin;
    }
  }

  const potentialLeft = position.left + (position.width / 2) - (carouselWidth / 2);
  const viewportWidth = window.innerWidth;

  if (potentialLeft < 0) {
    calculatedLeft = margin;
  } else if (potentialLeft + carouselWidth > viewportWidth) {
    calculatedLeft = viewportWidth - carouselWidth - margin;
  } else {
    calculatedLeft = potentialLeft;
  }

  const floatingCarouselStyle = {
    top: `${calculatedTop}px`,
    left: `${calculatedLeft}px`,
    width: `${carouselWidth}px`,
    height: `${carouselHeight}px`,
  };

  return (
    <>
      <div
        className="fixed z-100 bg-gray-900 bg-opacity-95 rounded-lg shadow-2xl p-2 flex flex-col items-center justify-center"
        style={floatingCarouselStyle}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute z-10 top-1 right-1 text-white hover:bg-gray-700"
        >
          <X className="h-5 w-5" />
        </Button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-white">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>加载中...</p>
          </div>
        ) : imageUrls.length > 0 ? (
          <Carousel className="w-full h-full max-w-xs mx-auto">
            <CarouselContent className="h-full">
              {imageUrls.map((url, index) => (
                <CarouselItem key={index} className="h-full flex items-center justify-center">
                  <div
                    onClick={() => handleImageClick(index)}
                    className="cursor-pointer w-full h-full"
                  >
                    <AspectRatio ratio={16/9}>
                      <img
                        src={url}
                        alt={`${wordText} image ${index + 1}`}
                        className="object-contain w-full h-full rounded-md"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/160x90/FFF/888?text=Image+Load+Error";
                        }}
                      />
                    </AspectRatio>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {imageUrls.length > 1 && (
              <>
                <CarouselPrevious className="absolute left-1 top-1/2 -translate-y-1/2 text-white hover:bg-gray-700 w-6 h-6" />
                <CarouselNext className="absolute right-1 top-1/2 -translate-y-1/2 text-white hover:bg-gray-700 w-6 h-6" />
              </>
            )}
          </Carousel>
        ) : (
          <div className="flex flex-col items-center justify-center text-white text-center p-4">
            <p className="mb-4">暂无数据</p>
            <Button onClick={handleGenerateClick} disabled={isGeneratingImages}>
              {isGeneratingImages ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在生成...</>
              ) : (
                "创建详情或生成新图片"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Enlarged Image Dialog */}
      <Dialog open={showEnlargedDialog} onOpenChange={setShowEnlargedDialog}>
        <DialogContent className="
        fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-[calc(100vw-2rem)]
        sm:max-w-2xl
        md:max-w-3xl
        lg:max-w-4xl
        xl:max-w-5xl
        max-h-[90vh]
        flex flex-col items-center justify-center
        bg-background
        p-1
        rounded-lg shadow-lg z-101"
        aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            {`“${wordText}”的放大图片轮播`}
          </DialogTitle>
          <EnlargedImageCarousel
            imageUrls={imageUrls}
            wordText={wordText}
            initialIndex={enlargedImageIndex}
            onCloseDialog={() => setShowEnlargedDialog(false)}
            className="w-full h-full bg-black/10 rounded-md"
          />
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

interface EnlargedImageCarouselProps {
  imageUrls: string[];
  wordText: string;
  initialIndex: number | null;
  onCloseDialog: () => void;
  className?: string; // Add className prop for flexibility
}

// 封装大图轮播的独立组件
const EnlargedImageCarousel: React.FC<EnlargedImageCarouselProps> = ({
  imageUrls,
  wordText,
  initialIndex,
  onCloseDialog,
  className, // Receive className
}) => {
  const [api, setApi] = useState<CarouselApi | null>(null); // 使用 useState 管理 api 状态

  // 当 API 可用或 initialIndex 改变时，滚动到初始索引
  useEffect(() => {
    if (api && initialIndex !== null) {
      api.scrollTo(initialIndex, true); // true 表示平滑滚动
    }
  }, [api, initialIndex]);

  // 键盘导航逻辑
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 检查当前焦点是否在输入框或文本域中，如果是则不拦截键盘事件
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

      if (isTyping) {
          return;
      }

      if (event.key === 'ArrowLeft') {
          event.preventDefault();
          api?.scrollPrev(); // 使用 carousel API 滚动到上一张
      } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          api?.scrollNext(); // 使用 carousel API 滚动到下一张
      } else if (event.key === 'Escape') { // 增加 Escape 键关闭弹窗
          event.preventDefault();
          onCloseDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [api, onCloseDialog]); // 依赖 api 和 onCloseDialog

  // // 禁用按钮的逻辑
  // const isPreviousEnlargedDisabled = !api || api.selectedScrollSnap() === 0;
  // const isNextEnlargedDisabled = !api || api.selectedScrollSnap() === api.scrollSnapList().length - 1;

  if (imageUrls.length === 0) {
    return (
      <div className={`flex items-center justify-center w-full h-full text-white ${className}`}> {/* Ensure this fallback also fills space */}
        <p>没有找到大图。</p>
      </div>
    );
  }

  return (
    <Carousel
      className={`flex flex-col items-center justify-center ${className || ''}`} // 应用传入的 className
      opts={{
        align: "start",
        loop: false,
      }}
      setApi={setApi} // 将 API 传递给 Carousel
    >
      <CarouselContent className="w-full h-full items-center -ml-2">
        {imageUrls.map((url, index) => (
          <CarouselItem key={index} className="flex justify-center items-center h-full">
            <img
              src={url}
              alt={`${wordText} image ${index + 1}`}
              className="object-contain w-full h-full max-h-[85vh] rounded-md" // 调整图片自身的最大高度，并添加圆角
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/800x450/FFF/888?text=Image+Load+Error";
              }}
            />
          </CarouselItem>
        ))}
      </CarouselContent>

      {imageUrls.length > 1 && (
        <>
          {/* <CarouselPrevious
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20"
            onClick={() => api?.scrollPrev()} // 使用 API 滚动
            disabled={isPreviousEnlargedDisabled}
          />
          <CarouselNext
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20"
            onClick={() => api?.scrollNext()} // 使用 API 滚动
            disabled={isNextEnlargedDisabled}
          /> */}
            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 export-hide" />
            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 export-hide" />
        </>
      )}
    </Carousel>
  );
};

export default FloatingImageCarousel;
