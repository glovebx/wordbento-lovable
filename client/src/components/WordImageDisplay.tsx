import React, { useState, useEffect, useCallback } from 'react';

// Import Dialog components using the structure you provided
import {
  Dialog,
  DialogContent,
  DialogHeader, // Not needed for a simple image dialog
  DialogFooter, // Not needed for a simple image dialog
  DialogTitle, // Not needed for a simple image dialog
  // DialogDescription, // Not needed for a simple image dialog
} from "@/components/ui/dialog"; // Adjust the import path
import { AspectRatio } from "@/components/ui/aspect-ratio"; // Import AspectRatio

// Import the Carousel components you provided
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel"; // Adjust the import path

// Import RadioGroup components for the new dialog
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label'; // Import Label for radio buttons

import GeneratingFallback from '@/components/GeneratingFallback';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

// Import the useGenerateImages hook
import { useGenerateImages } from '@/hooks/use-generate-images'; // Adjust path as needed
import { WordDataType } from '@/types/wordTypes';
import { Button } from '@/components/ui/button'; // Import Button component
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'; // Import Loader icon

interface WordImageDisplayProps {
  initialImageUrls: string[]; // Array of image URLs
  word: WordDataType;
  isWordLoading: boolean;
  onImagesGenerated: (word: string) => void;
  // New props: Callbacks to report dialog state changes
  onShowImageDialogChange?: (isOpen: boolean) => void; // <-- New prop
  onShowExampleDialogChange?: (isOpen: boolean) => void; // <-- New prop  
}

const WordImageDisplay: React.FC<WordImageDisplayProps> = ({ 
  initialImageUrls, 
  word,
  isWordLoading,
  onImagesGenerated,
  onShowImageDialogChange, // <-- Receive new prop
  onShowExampleDialogChange, // <-- Receive new prop  
}) => {
  // State to control the visibility of the image dialog
  const [showImageDialog, setShowImageDialog] = useState(false);
  // State to store the URL of the image currently displayed in the dialog
  // null when no image is selected or dialog is closed
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  // // State to track if image generation is in progress
  // const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  // State to manage the image URLs displayed in the carousel
  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls || []);

  const { isAuthenticated } = useAuth();  
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Use the useGenerateImages hook internally
  const { generateImages, isGeneratingImages, generationError } = useGenerateImages();

    // State for the new example selection dialog
  const [showExampleDialog, setShowExampleDialog] = useState(false);
  const [selectedExample, setSelectedExample] = useState<string | null>(null); // State to hold the selected example string

  // Effect to update internal imageUrls state when initialImageUrls prop changes
  useEffect(() => {
    setImageUrls(initialImageUrls || []);
  }, [initialImageUrls]); // Dependency: initialImageUrls prop

  // --- Effects to report dialog state changes ---
  useEffect(() => {
      if (onShowImageDialogChange) {
        console.log(`showImageDialog ${showImageDialog}`)
          onShowImageDialogChange(showImageDialog);
      }
  }, [showImageDialog, onShowImageDialogChange]); // Dependency: showImageDialog state

  useEffect(() => {
      if (onShowExampleDialogChange) {
        console.log(`showExampleDialog ${showExampleDialog}`)
          onShowExampleDialogChange(showExampleDialog);
      }
  }, [showExampleDialog, onShowExampleDialogChange]); // Dependency: showExampleDialog state
  // --- End Effects ---
    
  // Handler to open the image dialog and set the selected image
  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index); // Set the index of the image to display in the dialog
    setShowImageDialog(true); // Open the dialog
  }, []); // No dependencies needed as it only sets state

  // // Handler to close the dialog (Dialog's onOpenChange handles clearing selectedImageUrl implicitly)
  // const handleDialogClose = () => {
  //   setShowImageDialog(false);
  //   // Optional: Clear selected image URL after closing if you want to reset
  //   // setSelectedImageUrl(null);
  // };

  // Handler for the "Generate Images" button click
  const handleGenerateButtonClick = useCallback(async () => {
    if (!isAuthenticated) {
      // If user is not authenticated, trigger the login prompt
      setShowAuthModal(true);
      return; // Stop here, wait for login
    }

    // // Call the parent-provided function to generate images
    // // The parent is responsible for making the API call and updating imageUrls state
    // const generatedUrls = await generateImages(word.word_text);

    // // If images were generated successfully, update the internal state
    // if (generatedUrls && generatedUrls.length > 0) {
    //   setImageUrls(generatedUrls);
    // }  
    // Check if English examples exist and are an array
    const examples = word?.content?.examples?.en;
    if (examples && Array.isArray(examples) && examples.length > 0) {
      // If examples exist and are an array, open the example selection dialog
      setShowExampleDialog(true);
    } else {
      // If no examples or not an array, proceed directly with image generation using just the word
      console.log("No examples found or examples not in expected array format, generating image with word only.");
      const generatedUrls = await generateImages(word.word_text, '');
      if (generatedUrls && generatedUrls.length > 0) {
        onImagesGenerated(word.word_text);
        // setImageUrls(generatedUrls.map(img => img.url));
        setImageUrls(generatedUrls);
      }
    }        
  }, [isAuthenticated, generateImages, word]); // Added wordData dependency


  // Handler when an example is selected in the dialog and confirmed
  const handleExampleSelected = useCallback(async () => {
      if (!selectedExample) {
          console.warn("No example selected.");
          // Optionally show a toast message
          return;
      }

      setShowExampleDialog(false); // Close the example selection dialog
      setSelectedExample(null); // Reset selected example state

      console.log(`Generating image for word "${word.word_text}" with example: "${selectedExample}"`);

      // Call the generateImages hook, passing the selected example
      // Assuming the hook/backend is updated to handle this
      const generatedUrls = await generateImages(word.word_text, selectedExample);

      if (generatedUrls && generatedUrls.length > 0) {
        onImagesGenerated(word.word_text);
        // setImageUrls(generatedUrls.map(url => url));
        setImageUrls(generatedUrls);
      }
  }, [generateImages, word, selectedExample]); // Dependencies: generateImages, wordText, selectedExample


  // --- Handlers for Dialog Navigation ---
  // Navigate to the previous image in the dialog
  const handlePreviousImage = useCallback(() => {
    // Ensure an image is selected and it's not the first image
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
        setSelectedImageIndex(selectedImageIndex - 1);
    }
}, [selectedImageIndex]); // Dependency: selectedImageIndex

// Navigate to the next image in the dialog
const handleNextImage = useCallback(() => {
    // Ensure an image is selected and it's not the last image
    if (selectedImageIndex !== null && selectedImageIndex < imageUrls.length - 1) {
        setSelectedImageIndex(selectedImageIndex + 1);
    }
}, [selectedImageIndex, imageUrls.length]); // Dependencies: selectedImageIndex, imageUrls.length

// --- New useEffect for Keyboard Navigation ---
  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
          // Handle arrow key presses
          if (event.key === 'ArrowLeft') {
              event.preventDefault(); // Prevent default browser scroll behavior
              handlePreviousImage(); // Call the previous word handler
          } else if (event.key === 'ArrowRight') {
              event.preventDefault(); // Prevent default browser scroll behavior
              handleNextImage(); // Call the next word handler
          }
      };

      // Add the event listener to the window
      window.addEventListener('keydown', handleKeyDown);

      // Clean up the event listener when the component unmounts
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [handlePreviousImage, handleNextImage]); // Dependencies: loading states and navigation handlers
  // --- End New useEffect for Keyboard Navigation ---

  // Determine if we should show the "Generate Images" button
  const showGenerateButton = (!imageUrls || imageUrls.length === 0) && !isGeneratingImages;
  // Determine if we should show the Carousel
  const showCarousel = imageUrls && imageUrls.length > 0;

    // Get the URL for the currently selected image in the dialog
  // Access imageUrls array using the selectedImageIndex
  const currentDialogImageUrl = selectedImageIndex !== null ? imageUrls[selectedImageIndex] : null;

  // Determine if dialog navigation buttons should be disabled
  // Previous button is disabled if it's the first image or no image is selected
  const isPreviousDisabled = selectedImageIndex === 0 || selectedImageIndex === null;
  // Next button is disabled if it's the last image or no image is selected
  const isNextDisabled = selectedImageIndex === imageUrls.length - 1 || selectedImageIndex === null;

  // Get English examples for the dialog
  const englishExamples = word?.content?.examples?.en || [];

  return (
    <>
      {/* Conditional Rendering based on state */}
      {showGenerateButton && (
        // Display the "Generate Images" button when no images and not generating
        <div className="text-center my-8"> {/* Add some margin */}
          <Button onClick={handleGenerateButtonClick} disabled={isGeneratingImages || isWordLoading}>
            {isGeneratingImages ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中... 
              </>
            ) : (
              "生成图片" // Button text when idle
            )}
          </Button>
        </div>
      )}

      {isGeneratingImages && !showCarousel && (
        // Display a loading indicator while generating images and no images are displayed yet
        // <div className="text-center my-8">
        //    <div className="animate-spin rounded-full h-12 w-12 border-4 border-dashed border-blue-500 mx-auto mb-4"></div>
        //    <p className="text-lg text-gray-600">正在生成图片...</p>
        // </div>
        <GeneratingFallback message="" />        
      )}

       {/* Optional: Display generation error if any */}
       {generationError && !isGeneratingImages && (
           <div className="text-center my-8 text-red-600">
               <p>图片生成失败: {generationError.message}</p>
           </div>
       )}

      {/* Image Carousel Section */}
      {/* max-w-lg mx-auto centers the carousel */}
      {showCarousel && (
        <div className="max-w-lg mx-auto mb-8">
          {/* Use the Carousel component */}
          <Carousel className="w-full"> {/* w-full makes the carousel take the width of its container */}
            <CarouselContent>
              {imageUrls.map((url, index) => (
                // Each image is a CarouselItem
                <CarouselItem key={index} className="export-carousel-item"> {/* Use index as key if URLs are not guaranteed unique/stable */}
                  {/* Wrap the image in a clickable container */}
                  <div
                    onClick={() => handleImageClick(index)} // Pass the clicked image URL to the handler
                    className="cursor-pointer rounded-md overflow-hidden transition-opacity hover:opacity-80 export-image" // Add hover effect
                  >
                    {/* Use AspectRatio for consistent size within the carousel item */}
                    <AspectRatio ratio={16/9} className="bg-muted">
                      <img
                        src={url}
                        alt={`Image ${index + 1} representing the word "${word.word_text}"`} // More specific alt text
                        className="object-cover w-full h-full" // Cover the container
                      />
                    </AspectRatio>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {/* Add navigation buttons */}
            {/* Position these relative to the Carousel container */}
            <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10" /> {/* Adjust positioning */}
            <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10" /> {/* Adjust positioning */}
          </Carousel>
        </div>
      )}

      {/* Dialog for displaying the enlarged image */}
      {/* Dialog is open if showImageDialog is true */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        {/* Use DialogContent with appropriate styling for an image */}
        <DialogContent className="sm:max-w-[800px] w-full h-auto p-2"> {/* Adjust max-width and remove padding */}
          {/* Display the selected image inside the dialog */}
          {currentDialogImageUrl && ( // Only render img if a URL is selected
             <img
               src={currentDialogImageUrl} // Use the selected image URL
               alt={`Enlarged image ${selectedImageIndex !== null ? selectedImageIndex + 1 : ''} for the word "${word.word_text}"`} // Alt text for enlarged image
               className="object-contain w-full h-full max-h-[80vh]" // Use object-contain and max-height to fit
             />
          )}

           {/* --- Dialog Navigation Buttons --- */}
           {/* Only show navigation buttons if there are images in the carousel */}
           {showCarousel && (
               <>
                   {/* Previous Button */}
                   <Button
                       variant="ghost" // Use ghost variant for a less prominent button
                       size="icon" // Use icon size for a small circular button
                       className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-black/50" // Position absolutely, style with white text and hover effect
                       onClick={handlePreviousImage} // Call the previous image handler
                       disabled={isPreviousDisabled} // Disable if it's the first image
                       aria-label="Previous image" // Accessibility label
                   >
                       <ChevronLeft className="h-6 w-6" /> {/* Left arrow icon */}
                   </Button>
                   {/* Next Button */}
                   <Button
                       variant="ghost" // Use ghost variant
                       size="icon" // Use icon size
                       className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-black/50" // Position absolutely, style
                       onClick={handleNextImage} // Call the next image handler
                       disabled={isNextDisabled} // Disable if it's the last image
                       aria-label="Next image" // Accessibility label
                   >
                       <ChevronRight className="h-6 w-6" /> {/* Right arrow icon */}
                   </Button>
               </>
           )}
           {/* --- End Dialog Navigation Buttons --- */}          
          {/* DialogClose is typically included in DialogContent in shadcn/ui's implementation */}
          {/* If your DialogContent doesn't include it, you might need to add it explicitly */}
          {/* <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus-ring-ring focus-ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4 text-white" /> // White icon for contrast on image
            <span className="sr-only">Close</span>
          </DialogClose> */}
        </DialogContent>
      </Dialog>


      {/* --- New: Example Selection Dialog --- */}
      <Dialog open={showExampleDialog} onOpenChange={setShowExampleDialog}>
          <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                  <DialogTitle>选择一个例句生成图片</DialogTitle>
              </DialogHeader>
              {englishExamples && Array.isArray(englishExamples) && englishExamples.length > 0 ? (
                  <RadioGroup onValueChange={setSelectedExample} value={selectedExample || undefined} className="max-h-[300px] overflow-y-auto pr-4"> {/* Added max-height and overflow for scrolling */}
                      {englishExamples.map((example: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer"> {/* Added styling */}
                              <RadioGroupItem value={example} id={`example-${index}`} />
                              <Label htmlFor={`example-${index}`} className="cursor-pointer text-base font-normal leading-relaxed"> {/* Adjusted font size and line height */}
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
                      disabled={!selectedExample || isGeneratingImages} // Disable if no example selected or generating
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
      {/* --- End: Example Selection Dialog --- */}

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {}}
      />      
    </>
  );
};

export default WordImageDisplay;
