// import { useState, useEffect, useCallback } from 'react';
// import { axiosPrivate } from "@/lib/axios"; // Adjust path to your axiosPrivate
// import axios, { AxiosError } from 'axios'; // Import AxiosError for type checking
// import { useToast } from '@/hooks/use-toast';

// export type Llm = {
//   id: number;
//   platform: 'deepseek' | 'gemini' | 'openai' | 'doubao' | 'jimeng' | 'dreamina' | 'scraper';
//   endpoint: string;
//   token: string;
//   model: string;
// };

// export const useLlms = (isAuthenticated: boolean) => {
//   const [recentLlms, setRecentLlms] = useState<Llm[]>([]);
//   const [isLoading, setIsLoading] = useState(false);

//   const [isSaving, setIsSaving] = useState(false);
//   const [saveError, setSaveError] = useState<AxiosError | Error | null>(null);

//   const { toast } = useToast();

//   // Internal helper to fetch submissions with pagination
//   const fetchLlms = useCallback(async () => {
//     if (!isAuthenticated) {
//       setIsLoading(false);
//       setRecentLlms([]);
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const response = await axiosPrivate.get('/api/llm/list');

//       if (response.status === 200 || response.status === 201) {
//         const newLlms: Llm[] = response.data;
        
//         setRecentLlms(newLlms);
        
//       } else {
//         toast({
//           title: "加载大模型记录失败",
//           description: `服务器错误: ${response.status}`,
//           variant: "destructive",
//         });
//       }
//     } catch (error: any) {
//       console.error('Failed to load llms:', error);
//       toast({
//         title: "加载大模型记录失败",
//         description: `无法获取您的最近提交记录: ${error.message || '网络错误'}`,
//         variant: "destructive",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   }, [isAuthenticated, toast]);

//   // Effect for initial load and when isAuthenticated changes
//   useEffect(() => {
//     // Reset state and load first page when isAuthenticated changes
//     setRecentLlms([]);
//     if (isAuthenticated) {
//       fetchLlms();
//     } else {
//       setIsLoading(false); // No loading if not authenticated
//     }
//   }, [isAuthenticated, fetchLlms]);


//   /**
//    * Triggers the backend API to generate images for a given word.
//    *
//    * @param wordText The text of the word for which to generate images.
//    * @returns A Promise that resolves with an array of image URLs on success, or null on failure.
//    */
//   const saveLlm = useCallback(async (id: number, platform: string, endpoint: string, token: string, model: string): Promise<boolean | null> => {
//     setIsSaving(true);
//     setSaveError(null); // Clear previous errors
//     console.log(`Hook: Attempting to save llm data: ${endpoint}`);

//     try {
//       // Example API call (replace with your actual endpoint and payload)
//       // Assuming a POST endpoint like /api/word/:wordText/generate-images that returns { imageUrls: string[] }
//       const response = await axiosPrivate.post('/api/llm/save', 
//         JSON.stringify({ id: id, platform: platform, endpoint: endpoint, token: token, model: model })
//       );

//       if (response.status === 200 || response.status === 201) {
//         console.log("Hook: Llm saving successful. Received URLs:");

//         return true;
//       } else {
//         console.error("Hook: Llm saving API returned unexpected response:", response);
//         //  toast({
//         //     title: "图片生成失败",
//         //     description: "后端未返回图片URL。",
//         //     variant: "destructive",
//         //  });
//         setSaveError(new Error("Backend did not save successfully."));
//         return false;
//       }

//     } catch (error: any) { // Catch Axios errors or other errors
//       console.error("Hook: Error calling llm saving API:", error);
//       setSaveError(axios.isAxiosError(error) ? error : new Error(error.message || 'Unknown error during saving.'));
//       return false; // Return null on error
//     } finally {
//       setIsSaving(false); // Always set loading to false when the request finishes
//     }
//   }, [toast, axiosPrivate]); // Dependencies: toast and axiosPrivate

//   return { recentLlms, isLoading, saveLlm, isSaving, saveError};
// };
import { useState, useEffect, useCallback } from 'react';
import { axiosPrivate } from "@/lib/axios"; // 假设 axiosPrivate 是一个稳定的、不随渲染变化的实例
import axios, { AxiosError } from 'axios'; 
import { useToast } from '@/hooks/use-toast';

export type Llm = {
  id: number;
  platform: 'deepseek' | 'gemini' | 'openai' | 'doubao' | 'jimeng' | 'seedream' | 'dreamina' | 'scraper';
  endpoint: string;
  token: string;
  model: string;
  active: boolean;
};

// 用于保存操作的数据类型，id可选（新建时没有）
export type SaveLlmData = Omit<Llm, 'id'> & { id?: number };

export const useLlms = (isAuthenticated: boolean) => {
  const [recentLlms, setRecentLlms] = useState<Llm[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<AxiosError | Error | null>(null);

  const { toast } = useToast();

  // Internal helper to fetch LLMs
  // 依赖中只保留会变化的或触发副作用的变量
  const fetchLlms = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setRecentLlms([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosPrivate.get('/api/llm/list');

      if (response.status === 200 || response.status === 201) {
        const newLlms: Llm[] = response.data;
        setRecentLlms(newLlms);
        
      } else {
        toast({
          title: "加载大模型记录失败",
          description: `服务器错误: ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Failed to load llms:', error);
      const errorMessage = error.response?.data?.message || error.message || '网络错误';
      toast({
        title: "加载大模型记录失败",
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
    setRecentLlms([]);
    if (isAuthenticated) {
      fetchLlms();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchLlms]);


  /**
   * Triggers the backend API to save or update an LLM configuration.
   *
   * @param llmData The data object for the LLM configuration.
   * @returns A Promise that resolves with a boolean indicating success (true) or failure (false).
   */
  const saveLlm = useCallback(async (llmData: SaveLlmData): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null); 
    console.log(`Hook: Attempting to save llm data: ${llmData.endpoint}`);

    try {
      // Axios 自动序列化 JS 对象为 JSON，无需手动 JSON.stringify
      const response = await axiosPrivate.post('/api/llm/save', llmData); 

      if (response.status === 200 || response.status === 201) {
        console.log("Hook: Llm saving successful.");
        
        // **优化点：保存成功后刷新列表**
        await fetchLlms(); 

        toast({
            title: "配置保存成功",
            description: `模型 ${llmData.model} 配置已更新。`,
            variant: "default",
        });
        
        return true;
      } else {
        console.error("Hook: Llm saving API returned unexpected response:", response);
        setSaveError(new Error(`Backend did not save successfully. Status: ${response.status}`));
        return false;
      }

    } catch (error: any) { 
      const err = axios.isAxiosError(error) ? error : new Error(error.message || 'Unknown error during saving.');
      console.error("Hook: Error calling llm saving API:", error);
      
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
  }, [toast, fetchLlms]); // **优化点：添加 fetchLlms 依赖**

  return { recentLlms, isLoading, saveLlm, isSaving, saveError};
};