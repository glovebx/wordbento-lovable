import { useState, useCallback } from 'react';
import { axiosPrivate } from '@/lib/axios'; // Adjust path as needed
import { useToast } from '@/components/ui/use-toast'; // Adjust path as needed
import axios, { AxiosError } from 'axios'; // Import AxiosError for type checking

/**
 * Custom hook to handle the process of generating images for a word via the backend API.
 * Manages the loading and error states specifically for the image generation request.
 */
export const useGenerateImages = () => {
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generationError, setGenerationError] = useState<AxiosError | Error | null>(null);

  const { toast } = useToast();

  /**
   * Triggers the backend API to generate images for a given word.
   *
   * @param wordText The text of the word for which to generate images.
   * @returns A Promise that resolves with an array of image URLs on success, or null on failure.
   */
  const generateImages = useCallback(async (wordText: string, example: string, force: boolean): Promise<string[] | null> => {
    setIsGeneratingImages(true);
    setGenerationError(null); // Clear previous errors
    console.log(`Hook: Attempting to generate images for word: ${wordText}`);

    try {
      // Example API call (replace with your actual endpoint and payload)
      // Assuming a POST endpoint like /api/word/:wordText/generate-images that returns { imageUrls: string[] }
      const response = await axiosPrivate.post('/api/word/imagize', JSON.stringify({ slug: wordText, example: example, force: force }));

      if (response.status === 200 && response.data?.imageUrls) {
        console.log("Hook: Image generation successful. Received URLs:");
        // toast({
        //    title: "图片生成成功",
        //    description: `已为单词 "${wordText}" 生成图片。`,
        //    variant: "default",
        // });

        return response.data.imageUrls; // Return the array of image URLs
      } else {
        console.error("Hook: Image generation API returned unexpected response:", response);
        //  toast({
        //     title: "图片生成失败",
        //     description: "后端未返回图片URL。",
        //     variant: "destructive",
        //  });
        setGenerationError(new Error("Backend did not return image URLs."));
        return null; // Return null on unexpected response
      }

    } catch (error: any) { // Catch Axios errors or other errors
      console.error("Hook: Error calling image generation API:", error);
      setGenerationError(axios.isAxiosError(error) ? error : new Error(error.message || 'Unknown error during image generation.'));
    //    toast({
    //       title: "图片生成失败",
    //       description: `生成图片时发生错误：${error.message || '未知错误'}`,
    //       variant: "destructive",
    //    });
      return null; // Return null on error
    } finally {
      setIsGeneratingImages(false); // Always set loading to false when the request finishes
    }
  }, [toast, axiosPrivate]); // Dependencies: toast and axiosPrivate

  // Return the generation function and states
  return {
    generateImages,
    isGeneratingImages,
    generationError,
  };
};