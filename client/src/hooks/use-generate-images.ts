import { useState, useCallback } from 'react';
import { axiosPrivate } from '@/lib/axios'; // Adjust path as needed
import { AxiosError } from 'axios'; // Import AxiosError for type checking

/**
 * Custom hook to handle the process of generating images for a word via the backend API.
 * Manages the loading and error states specifically for the image generation request.
 */
export const useGenerateImages = () => {
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generationError, setGenerationError] = useState<AxiosError | Error | null>(null);

  /**
   * Triggers the backend API to generate images for a given word.
   *
   * @param wordText The text of the word for which to generate images.
   * @returns A Promise that resolves with an array of image URLs on success, or null on failure.
   */
  const generateImages = useCallback(async (wordText: string, example: string, force: boolean): Promise<string[] | null> => {
    setIsGeneratingImages(true);
    setGenerationError(null); // Clear previous errors
    // console.log(`Hook: Attempting to generate images for word: ${wordText}`);

    try {
      // Example API call (replace with your actual endpoint and payload)
      // Assuming a POST endpoint like /api/word/:wordText/generate-images that returns { imageUrls: string[] }
      const response = await axiosPrivate.post('/api/word/imagize', JSON.stringify({ slug: wordText, example: example, force: force }));

      if (response.status === 200 && response.data?.imageUrls) {
        // console.log("Hook: Image generation successful. Received URLs:");
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
      let message = error.message || 'Unknown error during image generation.';
      if (error instanceof AxiosError) {
          const responseData = error.response?.data;
          if (typeof responseData === 'string') {
              message = responseData;
          } else if (responseData && typeof responseData.message === 'string') {
              message = responseData.message;
          }
      }      
      setGenerationError(new Error(message));
    //    toast({
    //       title: "图片生成失败",
    //       description: `生成图片时发生错误：${error.message || '未知错误'}`,
    //       variant: "destructive",
    //    });
      return null; // Return null on error
    } finally {
      setIsGeneratingImages(false); // Always set loading to false when the request finishes
    }
  }, [axiosPrivate]); // Dependencies: toast and axiosPrivate

   const addOrReplaceImage = useCallback(async (dataUrl: string, imageUrl: string, redact: boolean, replace: boolean): Promise<string[] | null> => {
    setIsGeneratingImages(true);
    setGenerationError(null); // Clear previous errors
    // console.log(`Hook: Attempting to replace image for word: ${wordText}`);

    try {
      // Example API call (replace with your actual endpoint and payload)
      const response = await axiosPrivate.post('/api/word/reimagine', JSON.stringify({ dataUrl: dataUrl, imageUrl: imageUrl, redact: redact, replace: replace }));

      if (response.status === 200 && response.data?.imageUrls) {
        // console.log("Hook: Image generation successful. Received URLs:");
        // toast({
        //    title: "图片生成成功",
        //    description: `已为单词 "${wordText}" 生成图片。`,
        //    variant: "default",
        // });

        return response.data.imageUrls; // Return the array of image URLs
      } else {
        console.error("Hook: Image generation API returned unexpected response:", response);
        setGenerationError(new Error("Backend did not return image URLs."));
        return null; // Return null on unexpected response
      }

    } catch (error: any) { // Catch Axios errors or other errors
      console.error("Hook: Error calling image generation API:", error);
      let message = error.message || 'Unknown error during image replacement.';
      if (error instanceof AxiosError) {
          const responseData = error.response?.data;
          if (typeof responseData === 'string') {
              message = responseData;
          } else if (responseData && typeof responseData.message === 'string') {
              message = responseData.message;
          }
      }      
      setGenerationError(new Error(message));
      return null; // Return null on error
    } finally {
      setIsGeneratingImages(false); // Always set loading to false when the request finishes
    }
  }, [axiosPrivate]); // Dependencies: toast and axiosPrivate 

  const deleteImage = useCallback(async (imageUrl: string): Promise<string[] | null> => {
    setIsGeneratingImages(true);
    setGenerationError(null); // Clear previous errors

    try {
      // Example API call (replace with your actual endpoint and payload)
      const response = await axiosPrivate.post('/api/word/delimage', JSON.stringify({ imageUrl: imageUrl }));

      if (response.status === 200 && response.data?.imageUrls) {
        return response.data.imageUrls; // Return the array of image URLs
      } else {
        console.error("Hook: Image deletion API returned unexpected response:", response);
        setGenerationError(new Error("Backend did not return image URLs."));
        return null; // Return null on unexpected response
      }

    } catch (error: any) { // Catch Axios errors or other errors
      console.error("Hook: Error calling image deletion API:", error);
      let message = error.message || 'Unknown error during image deletion.';
      if (error instanceof AxiosError) {
          const responseData = error.response?.data;
          if (typeof responseData === 'string') {
              message = responseData;
          } else if (responseData && typeof responseData.message === 'string') {
              message = responseData.message;
          }
      }      
      setGenerationError(new Error(message));
      return null; // Return null on error
    } finally {
      setIsGeneratingImages(false); // Always set loading to false when the request finishes
    }
  }, [axiosPrivate]); // Dependencies: toast and axiosPrivate 

  const clearGenerationError = useCallback(() => {
    setGenerationError(null);
  }, []);

  // Return the generation function and states
  return {
    generateImages,
    addOrReplaceImage,
    deleteImage,
    isGeneratingImages,
    generationError,
    clearGenerationError,
  };
};