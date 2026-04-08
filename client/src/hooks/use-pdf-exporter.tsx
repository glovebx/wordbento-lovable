import { useState, useCallback } from 'react';
import { WordDataType } from '@/types/wordTypes';
import { useWordCache } from '@/hooks/use-word-cache';

export const usePdfExporter = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { getWordDetails } = useWordCache();

  const exportToPdf = useCallback(async (words: WordDataType[], fileName: string) => {
    if (words.length === 0) {
      console.error("No words provided for PDF export.");
      return;
    }
    
    setIsExporting(true);

    try {
      // 1. Fetch all word details
      const detailedWords = await Promise.all(
        words.map(word => getWordDetails(word.word_text))
      );
      const validWords = detailedWords.filter((word): word is WordDataType => word !== null);

      if (validWords.length === 0) {
        console.error("No valid word data could be fetched for PDF export.");
        return;
      }

      // 2. Dynamically import PDF libraries and components
      const [{ pdf }, { PdfDocument }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('@/components/pdf/PdfDocument')
      ]);

      // 3. Generate the PDF blob in memory
      const blob = await pdf(<PdfDocument words={validWords} />).toBlob();

      // 4. Trigger the download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // 5. Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [getWordDetails]);

  return { isExporting, exportToPdf };
};
