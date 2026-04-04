import { useState, useEffect, useCallback } from 'react';
import { axiosPrivate } from "@/lib/axios";
import axios, { AxiosError } from 'axios'; 
import { useToast } from '@/hooks/use-toast';
import { WordDataType } from '@/types/wordTypes';

export type Profile = {
  access_token: string;
};

// New types for word history
interface HistoryRecord extends WordDataType {
  viewedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
}

export const useProfile = (isAuthenticated: boolean) => {
  const [recentProfile, setRecentProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<AxiosError | Error | null>(null);

  // New states for word history
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({ currentPage: 1, totalPages: 0 });

  const { toast } = useToast();

  // Internal helper to fetch Profiles
  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setRecentProfile(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosPrivate.get('/api/profile/token/get');
      if (response.status === 200 || response.status === 201) {
        setRecentProfile(response.data);
      } else {
        toast({ title: "加载个人记录失败", description: `服务器错误: ${response.status}`, variant: "destructive" });
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      const errorMessage = error.response?.data?.message || error.message || '网络错误';
      toast({ title: "加载个人记录失败", description: `无法获取记录: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, toast]);

  // New function to fetch word history
  const fetchWordHistory = useCallback(async (page: number, searchTerm: string = '') => {
    if (!isAuthenticated) return;

    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await axiosPrivate.get('/api/profile/view-history', {
        params: { page, limit: 20, query: searchTerm },
      });
      setHistory(response.data.data);
      setPagination({ currentPage: response.data.currentPage, totalPages: response.data.totalPages });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setHistoryError(errorMessage);
      toast({ title: "加载浏览历史失败", description: errorMessage, variant: "destructive" });
    } finally {
      setIsHistoryLoading(false);
    }
  }, [isAuthenticated, toast]);

  // Effect for initial load and when isAuthenticated changes
  useEffect(() => {
    setRecentProfile(null);
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchProfile]);


  const renewAccessToken = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null); 
    try {
      const response = await axiosPrivate.post('/api/profile/token/renew', {}); 
      if (response.status === 200 || response.status === 201) {
        await fetchProfile(); 
        toast({ title: "重设成功", description: 'Access Token 配置已更新。' });
        return true;
      } else {
        setSaveError(new Error(`Backend did not save successfully. Status: ${response.status}`));
        return false;
      }
    } catch (error: any) { 
      const err = axios.isAxiosError(error) ? error : new Error(error.message || 'Unknown error during saving.');
      setSaveError(err);
      const errorMessage = error.response?.data?.message || err.message || '网络连接或服务器异常';
      toast({ title: "保存配置失败", description: `错误详情: ${errorMessage}`, variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false); 
    }
  }, [toast, fetchProfile]);

  return { 
    recentProfile, 
    isLoading, 
    renewAccessToken, 
    isSaving, 
    saveError, 
    // Expose new history-related state and functions
    history, 
    isHistoryLoading, 
    historyError, 
    pagination, 
    fetchWordHistory 
  };
};