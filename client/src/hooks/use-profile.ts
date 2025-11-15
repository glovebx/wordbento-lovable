import { useState, useEffect, useCallback } from 'react';
import { axiosPrivate } from "@/lib/axios";
import axios, { AxiosError } from 'axios'; 
import { useToast } from '@/hooks/use-toast';

export type Profile = {
  access_token: string;
};

export const useProfile = (isAuthenticated: boolean) => {
  const [recentProfile, setRecentProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<AxiosError | Error | null>(null);

  const { toast } = useToast();

  // Internal helper to fetch Profiles
  // 依赖中只保留会变化的或触发副作用的变量
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
        toast({
          title: "加载个人记录失败",
          description: `服务器错误: ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      const errorMessage = error.response?.data?.message || error.message || '网络错误';
      toast({
        title: "加载个人记录失败",
        description: `无法获取记录: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, toast]); // axiosPrivate 假定为常量，不放入依赖

  // Effect for initial load and when isAuthenticated changes
  useEffect(() => {
    // 重置状态
    setRecentProfile([]);
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchProfile]);


  /**
   * Triggers the backend API to save or update an Profile configuration.
   *
   * @param ProfileData The data object for the Profile configuration.
   * @returns A Promise that resolves with a boolean indicating success (true) or failure (false).
   */
  const renewAccessToken = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null); 
    console.log('Hook: Attempting to renew Profile data:');

    try {
      // Axios 自动序列化 JS 对象为 JSON，无需手动 JSON.stringify
      const response = await axiosPrivate.post('/api/profile/token/renew', {}); 

      if (response.status === 200 || response.status === 201) {
        console.log("Hook: Access token renewing successful.");
        
        // **优化点：保存成功后刷新列表**
        await fetchProfile(); 

        toast({
            title: "重设成功",
            description: 'Access Token 配置已更新。',
            variant: "default",
        });
        
        return true;
      } else {
        console.error("Hook: Profile saving API returned unexpected response:", response);
        setSaveError(new Error(`Backend did not save successfully. Status: ${response.status}`));
        return false;
      }

    } catch (error: any) { 
      const err = axios.isAxiosError(error) ? error : new Error(error.message || 'Unknown error during saving.');
      console.error("Hook: Error calling Profile saving API:", error);
      
      setSaveError(err);
      
      // **优化点：添加失败时的 Toast 提示**
      const errorMessage = error.response?.data?.message || err.message || '网络连接或服务器异常';
      toast({
        title: "保存配置失败",
        description: `错误详情: ${errorMessage}`,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsSaving(false); 
    }
  }, [toast, fetchProfile]); // **优化点：添加 fetchProfile 依赖**

  return { recentProfile, isLoading, renewAccessToken, isSaving, saveError};
};