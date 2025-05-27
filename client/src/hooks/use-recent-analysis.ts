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
};

export const useRecentAnalysis = (isAuthenticated: boolean) => {
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  // const [srt, setSrt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        const submissions = await fetchRecentSubmissions();
        setRecentSubmissions(submissions);
      } catch (error) {
        console.error('Failed to load recent submissions:', error);
        toast({
          title: "加载历史记录失败",
          description: "无法获取您的最近提交记录",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubmissions();
  }, [toast, isAuthenticated]);

  // Add new submission to the recent list
  const addSubmission = (newSubmission: Submission) => {
    setRecentSubmissions(prevSubmissions => {
      // Check if this submission already exists
      const exists = prevSubmissions.some(
        sub => sub.sourceType === newSubmission.sourceType && sub.content === newSubmission.content
      );
      
      if (exists) {
        // Move the existing submission to the top
        const filteredSubmissions = prevSubmissions.filter(
          sub => !(sub.sourceType === newSubmission.sourceType && sub.content === newSubmission.content)
        );
        return [newSubmission, ...filteredSubmissions].slice(0, 4);
      } else {
        // Add new submission to the top and keep only 4 items
        return [newSubmission, ...prevSubmissions].slice(0, 4);
      }
    });
  };

  const getSrt = async (uuid: string) => {
      try {
        const response = await axiosPrivate.get(`/api/analyze/srt/${uuid}`);
        // console.log('Response headers:', response.headers);
        // console.log('Response body:', response.data);

        // console.log('get srt successfully.');
        if (response.status === 200) {
          return response.data;
        }
        return null;
      } catch (error) {
          console.error('Failed to get srt:', error);
          return null;
      }    
  };

  return { recentSubmissions, isLoading, addSubmission, getSrt };
};

// Simulated API function - in a real application, this would be a proper API call
const fetchRecentSubmissions = async (): Promise<Submission[]> => {
  // In a real app, you would fetch from your backend using the userId
  console.log('Fetching recent submissions for current user');
  
  try {
    // /api/analyze
    const response = await axiosPrivate.get('/api/analyze/history');

    if (response.status === 200 || response.status === 201) {
      const submittedTask = response.data;
      return submittedTask;
    }
  } catch (err) {
      // 网络错误
      console.error('Network error fetching analysis history":', err);
  }

  return [];
  // // Simulate API delay
  // await new Promise(resolve => setTimeout(resolve, 500));
  
  // // Return mock data - in a real app this would come from your database
  // return [
  //   { type: 'url', content: 'https://example.com/english-vocabulary-article' },
  //   { type: 'url', content: 'https://language-learning.org/toefl-preparation' },
  //   { type: 'article', content: 'The importance of vocabulary acquisition in language learning cannot be overstated...' },
  //   { type: 'article', content: 'Many students struggle with reading comprehension in their second language...' }
  // ];
};