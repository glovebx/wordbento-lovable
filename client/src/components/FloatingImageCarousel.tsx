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
import { useGenerateImages } from '@/hooks/use-generate-images';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Define CarouselApi type for internal use (since it's not directly exported)
type CarouselApi = any; // You might get a proper type from shadcn/ui documentation if available

interface FloatingImageCarouselProps {
  wordText: string;
  position: { top: number; left: number; width: number; height: number; }; // position is relative to viewport
  onClose: () => void;
}

const FloatingImageCarousel: React.FC<FloatingImageCarouselProps> = ({
  wordText,
  position,
  onClose,
}) => {
  const { isAuthenticated } = useAuth();  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [showEnlargedDialog, setShowEnlargedDialog] = useState(false);
  const [enlargedImageIndex, setEnlargedImageIndex] = useState<number | null>(null);

  const { generateImages, isGeneratingImages } = useGenerateImages();

  // 获取图片 URL
  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const fetchImageUrls = async (word: string) => {
        try {
            const generatedUrls = await generateImages(word, '');
            if (generatedUrls && generatedUrls.length > 0) {
                setImageUrls(generatedUrls);
            } else {
                onClose(); // 如果没有生成图片，则关闭
            }
            
        } catch (error) {
            console.error('Failed to fetch images:', error);
            onClose(); // 出现错误时关闭
        }
    };

    fetchImageUrls(wordText);
  }, [isAuthenticated, generateImages, wordText, onClose]);

  // 处理图片点击，打开大图弹窗
  const handleImageClick = useCallback((index: number) => {
    setEnlargedImageIndex(index);
    setShowEnlargedDialog(true);
  }, []);

  // 计算浮动轮播的位置样式 - 动态调整以避免超出屏幕
  const carouselWidth = 320;
  const carouselHeight = 200;
  const margin = 20; // 单词与轮播之间的间距

  let calculatedTop = 0;
  let calculatedLeft = 0;

  // 尝试将轮播放置在单词上方
  const potentialTopAbove = position.top - carouselHeight - margin;

  // 如果上方空间不足 (例如，单词靠近视口顶部)，则放置在单词下方
  if (potentialTopAbove < 0) { // 假设顶部至少有0px，可以增加一个小的安全边距如10px
    calculatedTop = position.top + position.height + margin;
  } else {
    calculatedTop = potentialTopAbove;
  }

  // 确保轮播不会超出视口的底部
  const viewportHeight = window.innerHeight;
  if (calculatedTop + carouselHeight > viewportHeight) {
    calculatedTop = viewportHeight - carouselHeight - margin; // 距离底部也留出一些间距
    // 如果即使放置在底部边缘，仍然会超出顶部 (这发生在视口非常小且单词很靠下时)，
    // 则直接将其固定在顶部
    if (calculatedTop < 0) {
        calculatedTop = margin;
    }
  }

  // 计算左右位置 (居中于单词)
  const potentialLeft = position.left + (position.width / 2) - (carouselWidth / 2);
  const viewportWidth = window.innerWidth;

  // 确保轮播不会超出视口左侧
  if (potentialLeft < 0) { // 假设左侧至少有0px，可以增加一个小的安全边距如10px
    calculatedLeft = margin;
  } else if (potentialLeft + carouselWidth > viewportWidth) { // 确保不会超出视口右侧
    calculatedLeft = viewportWidth - carouselWidth - margin; // 距离右侧也留出一些间距
  } else {
    calculatedLeft = potentialLeft;
  }

  // 将计算后的位置应用到样式
  const floatingCarouselStyle = {
    top: `${calculatedTop}px`,
    left: `${calculatedLeft}px`,
    width: `${carouselWidth}px`,
    height: `${carouselHeight}px`,
  };

  return (
    <>
      {/* 浮动轮播容器 */}
      <div
        className="fixed z-[100] bg-gray-900 bg-opacity-95 rounded-lg shadow-2xl p-2 flex flex-col items-center justify-center"
        style={floatingCarouselStyle} // 应用计算后的样式
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute z-10 top-1 right-1 text-white hover:bg-gray-700"
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
                  <div
                    onClick={() => handleImageClick(index)} // 点击打开大图弹窗
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
            {/* 小轮播导航按钮 */}
            <CarouselPrevious className="absolute left-1 top-1/2 -translate-y-1/2 text-white hover:bg-gray-700 w-6 h-6" />
            <CarouselNext className="absolute right-1 top-1/2 -translate-y-1/2 text-white hover:bg-gray-700 w-6 h-6" />
          </Carousel>
        ) : (
          <div className="flex flex-col items-center justify-center text-white text-center p-4">
            <p className="mb-2">暂无图片。</p>
          </div>
        )}
      </div>

      {/* 大图弹窗 */}
      <Dialog open={showEnlargedDialog} onOpenChange={setShowEnlargedDialog}>
        <DialogContent className="
        fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-[calc(100vw-2rem)] /* 关键修改: 手机端宽度接近满屏，留1rem边距 */
        sm:max-w-2xl /* sm breakpoint onwards, max-w takes over */
        md:max-w-3xl
        lg:max-w-4xl
        xl:max-w-5xl
        max-h-[90vh] /* Max height of dialog content */
        flex flex-col items-center justify-center
        bg-background /* Use Shadcn default background */
        p-1 /* Add padding around the content */
        rounded-lg shadow-lg z-[101]
        ">
          {/* 为辅助功能添加 DialogTitle，视觉上隐藏 */}
          <DialogTitle className="sr-only">
            {`“${wordText}”的放大图片轮播`}
          </DialogTitle>

          {/* 将大图轮播封装为独立组件，并确保它能填充可用空间 */}
          <EnlargedImageCarousel
            imageUrls={imageUrls}
            wordText={wordText}
            initialIndex={enlargedImageIndex}
            onCloseDialog={() => setShowEnlargedDialog(false)}
            className="w-full h-full bg-black/10 rounded-md" /* 确保轮播组件填充其父容器，并添加黑色背景和圆角 */
          />
           {/* 关闭按钮 */}
           {/* <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEnlargedDialog(false)}
            className="absolute top-2 right-2 text-foreground hover:bg-muted-foreground/10 z-20"
          >
            <X className="h-6 w-6" />
          </Button> */}
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
