import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Define CarouselApi type for internal use (since it's not directly exported by shadcn/ui)
type CarouselApi = any;

interface EnlargedImageCarouselDialogProps {
  open: boolean; // Controls dialog visibility
  onOpenChange: (isOpen: boolean) => void; // Callback to close dialog
  imageUrls: string[];
  wordText: string;
  initialIndex: number | null; // Index of the image to start with
}

const EnlargedImageCarouselDialog: React.FC<EnlargedImageCarouselDialogProps> = ({
  open,
  onOpenChange,
  imageUrls,
  wordText,
  initialIndex,
}) => {
  const [api, setApi] = useState<CarouselApi | null>(null); // State to hold the carousel API instance

  // Effect to scroll the carousel to the initial index when API is available or dialog opens
  useEffect(() => {
    if (api && open && initialIndex !== null) {
      // Use setTimeout to ensure the carousel has rendered and measured itself
      // before attempting to scroll, especially on initial open.
      setTimeout(() => {
        api.scrollTo(initialIndex, true); // true for smooth scroll
      }, 0); 
    }
  }, [api, open, initialIndex]);

  // Keyboard navigation for enlarged dialog
  useEffect(() => {
    if (!open) return; // Only activate keyboard listener when the dialog is open

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the user is currently typing in an input or textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

      if (isTyping) {
        return; // If typing, do not intercept arrow keys
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault(); // Prevent default browser scroll behavior
        api?.scrollPrev(); // Use carousel API to scroll to the previous item
      } else if (event.key === 'ArrowRight') {
        event.preventDefault(); // Prevent default browser scroll behavior
        api?.scrollNext(); // Use carousel API to scroll to the next item
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false); // Close dialog on Escape key press
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown); // Clean up event listener
    };
  }, [api, open, onOpenChange]); // Dependencies: api, open state, and onOpenChange callback

  // Render a fallback message if no image URLs are provided
  if (imageUrls.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="
          fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[calc(100vw-4rem)] h-[calc(100vh-6rem)]
          max-w-screen-xl max-h-[90vh]
          flex flex-col items-center justify-center
          bg-background p-1 rounded-lg shadow-lg z-[101]
        ">
          <DialogTitle className="sr-only">
            {`Enlarged image carousel for "${wordText}"`}
          </DialogTitle>
          <div className="flex items-center justify-center w-full h-full text-foreground bg-gray-200 rounded-md">
            <p>没有找到大图。</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 text-foreground hover:bg-muted-foreground/10 z-20"
            autoFocus={false} // Prevent initial focus
          >
            <X className="h-6 w-6" />
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        {/* DialogTitle for accessibility, visually hidden */}
        <DialogTitle className="sr-only">
          {`“${wordText}”的放大图片轮播`}
        </DialogTitle>

        {/* The Carousel for displaying enlarged images */}
        <Carousel
          className="w-full h-full bg-black/10 rounded-md flex flex-col items-center justify-center"
          opts={{
            align: "start",
            loop: false, // Set to true if you want looping navigation
          }}
          setApi={setApi} // This prop is crucial for receiving the carousel API instance
        >
          <CarouselContent className="w-full h-full items-center -ml-2">
            {imageUrls.map((url, index) => (
              <CarouselItem key={index} className="flex justify-center items-center h-full">
                <img
                  src={url}
                  alt={`${wordText} image ${index + 1}`}
                  className="object-contain w-full h-full max-h-[80vh] rounded-md" // Max height relative to carousel item, added rounded-md
                  onError={(e) => {
                    // Fallback placeholder image in case of load error
                    e.currentTarget.src = "https://placehold.co/800x450/FFF/888?text=Image+Load+Error";
                  }}
                />
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation buttons for the enlarged carousel */}
          {imageUrls.length > 1 && ( // Only show buttons if there's more than one image
            <>
              {/* <CarouselPrevious
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20"
                onClick={() => api?.scrollPrev()} // Use carousel API method
                // Logic to determine if navigation buttons should be disabled
                disabled={!api || api.selectedScrollSnap() === 0}
              />
              <CarouselNext
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20"
                onClick={() => api?.scrollNext()} // Use carousel API method
                disabled={!api || api.selectedScrollSnap() === api.scrollSnapList().length - 1}
              /> */}
                          <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 export-hide" />
                          <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 export-hide" />
            </>
          )}
          
        </Carousel>

        {/* Close button for the enlarged dialog */}
        {/* <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 text-foreground hover:bg-muted-foreground/10 z-20"
          autoFocus={false} // Prevent initial focus on this button
        >
          <X className="h-6 w-6" />
        </Button> */}
      </DialogContent>
    </Dialog>
  );
};

export default EnlargedImageCarouselDialog;
