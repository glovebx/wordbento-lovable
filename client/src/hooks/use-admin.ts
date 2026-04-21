import { useState, useCallback } from 'react';
import { axiosPrivate } from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';
import { WordDataType } from '@/types/wordTypes';

interface PaginatedWordsResponse {
  data: WordDataType[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export const useAdmin = (isAuthenticated: boolean) => {
  const [words, setWords] = useState<WordDataType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });
  const { toast } = useToast();

  const fetchAllWords = useCallback(async (page: number, searchTerm: string = '', noImageOnly: boolean = false) => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get<PaginatedWordsResponse>('/api/admin/words', {
        params: { page, limit: 20, query: searchTerm, noImage: noImageOnly },
      });
      setWords(response.data.data);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        totalCount: response.data.totalCount,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({ title: "Failed to load words", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, toast]);

  const deleteWord = useCallback(async (wordId: number) => {
    if (!isAuthenticated) return false;

    try {
      await axiosPrivate.delete(`/api/admin/words/${wordId}`);
      toast({ title: "Success", description: "Word deleted successfully." });
      // // Refresh the word list after deletion
      // fetchAllWords(pagination.currentPage, searchTerm, noImageOnly);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast({ title: "Deletion Failed", description: errorMessage, variant: "destructive" });
      return false;
    }
  }, [isAuthenticated, toast, pagination.currentPage]);

  return {
    words,
    isLoading,
    error,
    pagination,
    fetchAllWords,
    deleteWord,
  };
};
