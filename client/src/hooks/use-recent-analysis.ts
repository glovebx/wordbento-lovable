// hooks/use-recent-analysis.ts
import { useState, useEffect, useCallback } from 'react';
import { axiosPrivate } from "@/lib/axios"; // Adjust path to your axiosPrivate
import { useToast } from '@/hooks/use-toast';

export type Submission = {
  uuid: string;
  sourceType: 'url' | 'article';
  examType: string;
  content: string;
  words: string;
  audioKey: boolean;
  captionSrt: boolean;
  timestamp: number; // Ensure timestamp exists for ordering
};

const BATCH_SIZE = 10; // Number of submissions to load per request

export const useRecentAnalysis = (isAuthenticated: boolean) => {
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // Tracks current page loaded
  const [hasMore, setHasMore] = useState(true); // True if there might be more data
  const { toast } = useToast();

  // Internal helper to fetch submissions with pagination
  const fetchSubmissions = useCallback(async (page: number) => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setHasMore(false); // No more data if not authenticated
      setRecentSubmissions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Assuming your backend API supports 'limit' and 'offset' for pagination
      const offset = page * BATCH_SIZE;
      const response = await axiosPrivate.get(`/api/analyze/history?limit=${BATCH_SIZE}&offset=${offset}`);

      if (response.status === 200 || response.status === 201) {
        const newSubmissions: Submission[] = response.data;
        
        setRecentSubmissions(prev => {
          // Filter out duplicates if newSubmissions contain items already in prev
          const existingIds = new Set(prev.map(sub => sub.uuid));
          const uniqueNewSubmissions = newSubmissions.filter(sub => !existingIds.has(sub.uuid));
          return [...prev, ...uniqueNewSubmissions];
        });
        
        // Determine if there are potentially more submissions
        setHasMore(newSubmissions.length === BATCH_SIZE);
      } else {
        toast({
          title: "加载历史记录失败",
          description: `服务器错误: ${response.status}`,
          variant: "destructive",
        });
        setHasMore(false); // No more data on error
      }
    } catch (error: any) {
      console.error('Failed to load recent submissions:', error);
      toast({
        title: "加载历史记录失败",
        description: `无法获取您的最近提交记录: ${error.message || '网络错误'}`,
        variant: "destructive",
      });
      setHasMore(false); // No more data on error
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, toast]);

  // Effect for initial load and when isAuthenticated changes
  useEffect(() => {
    // Reset state and load first page when isAuthenticated changes
    setRecentSubmissions([]);
    setCurrentPage(0);
    setHasMore(true); // Assume there's more data for a fresh start
    if (isAuthenticated) {
      fetchSubmissions(0);
    } else {
      setIsLoading(false); // No loading if not authenticated
    }
  }, [isAuthenticated, fetchSubmissions]);

  // Function to load more submissions (exposed to component)
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchSubmissions(nextPage);
    }
  }, [isLoading, hasMore, currentPage, fetchSubmissions]);

  // Add new submission to the recent list (only adds to the in-memory list, not Firestore)
  // This version handles adding a new submission at the top if it's genuinely new,
  // or moving it to the top if it already exists, maintaining uniqueness.
  // It no longer limits to 4, as the full list will be managed by pagination.
  const addSubmission = useCallback((newSubmission: Submission) => {
    setRecentSubmissions(prevSubmissions => {
      // Check if this submission (by uuid) already exists
      const exists = prevSubmissions.some(sub => sub.uuid === newSubmission.uuid);
      
      if (exists) {
        // If exists, filter it out and add the updated/new one to the top
        const filteredSubmissions = prevSubmissions.filter(sub => sub.uuid !== newSubmission.uuid);
        return [newSubmission, ...filteredSubmissions];
      } else {
        // If new, just add to the top
        return [newSubmission, ...prevSubmissions];
      }
    });
  }, []);

  const getSrt = useCallback(async (uuid: string) => {
      try {
        const response = await axiosPrivate.get(`/api/analyze/srt/${uuid}`);
        if (response.status === 200) {
          return response.data;
        }
        return null;
      } catch (error) {
          console.error('Failed to get srt:', error);
          return null;
      }    
  }, []);

  return { recentSubmissions, isLoading, addSubmission, getSrt, hasMore, loadMore };
};