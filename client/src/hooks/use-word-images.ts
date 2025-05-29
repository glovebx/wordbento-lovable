import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { axiosPrivate } from "@/lib/axios";

interface ImageData {
  url: string;
}

// Placeholder for a more robust image fetching/generation mechanism.
// In a real application, this would involve:
// 1. Checking a local cache (e.g., Firestore document for word images).
// 2. If not found, calling an image generation API (like Imagen-3.0).
// 3. Storing generated images for future use.

export const useWordImages = (wordText: string) => {
  const [imageUrls, setImageUrls] = useState<ImageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchAndGenerateImages = useCallback(async (word: string) => {
    if (!word) {
      setImageUrls([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setImageUrls([]); // Clear previous images

    try {
      // --- Simulate fetching from a database/cache first ---
      // In a real app, you'd check Firestore here:
      // const docRef = doc(db, "wordImages", word.toLowerCase());
      // const docSnap = await getDoc(docRef);
      // if (docSnap.exists()) {
      //   const data = docSnap.data();
      //   if (data.urls && data.urls.length > 0) {
      //     setImageUrls(data.urls.map((url: string) => ({ url })));
      //     setIsLoading(false);
      //     return;
      //   }
      // }

      console.log(`Generating images for: ${word}`);
      const payload = { instances: { prompt: `Generate an image related to the word "${word}"` }, parameters: { "sampleCount": 3 } };
      const apiKey = ""; // Canvas will provide this at runtime
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Image generation failed: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      if (result.predictions && result.predictions.length > 0) {
        const newImageUrls = result.predictions.map((prediction: any) => ({
          url: `data:image/png;base64,${prediction.bytesBase64Encoded}`
        }));
        setImageUrls(newImageUrls);

        // --- Simulate saving to a database/cache ---
        // In a real app, you'd save to Firestore here:
        // await setDoc(docRef, { urls: newImageUrls.map(img => img.url), timestamp: serverTimestamp() }, { merge: true });

      } else {
        setImageUrls([]);
        toast({
          title: "图片生成失败",
          description: `无法为 "${word}" 生成图片。`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error generating images:", err);
      setError(err);
      toast({
        title: "图片生成错误",
        description: err.message || "生成图片时发生未知错误。",
        variant: "destructive",
      });
      setImageUrls([]); // Clear images on error
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAndGenerateImages(wordText);
  }, [wordText, fetchAndGenerateImages]); // Re-fetch when wordText changes

  return { imageUrls, isLoading, error, refetchImages: fetchAndGenerateImages };
};
