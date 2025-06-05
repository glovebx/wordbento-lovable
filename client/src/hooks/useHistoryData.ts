import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { ResourceWithAttachments } from "@/types/database";
import { axiosPrivate } from "@/lib/axios";

export const useHistoryData = () => {
  const [resources, setResources] = useState<ResourceWithAttachments[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0); // 初始化总记录数

  const fetchAnalysisHistory = async (page: number = 1, limit: number = 20) => {
    setIsLoading(true);
    setError(null);

    try {
      // 修改 API 请求，使用查询参数
      const response = await axiosPrivate.get(`/api/analyze/list/${limit}/${page}`);
      console.log('History data response:', response.data);

      if (response.data && Array.isArray(response.data.data)) {
        setResources(response.data.data);
        setTotalCount(response.data.totalCount || 0); // 更新总记录数
      } else {
        setResources([]);
        setTotalCount(0);
        toast({
          title: "获取历史数据失败",
          description: "响应数据格式不正确。",
          variant: "destructive",
        });
      }
      
    } catch (err: any) {
      console.error("Failed to fetch analysis history:", err);
      setError(err.message || "获取历史数据失败");
      setResources([]);
      setTotalCount(0);
      toast({
        title: "获取历史数据失败",
        description: err.message || "服务器错误。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

// const fetchResourceDetail = async (resourceId: number) => {
//     try {
//       // 修改 API 请求，使用查询参数
//       const response = await axiosPrivate.get<ResourceWithAttachments>(`/api/analyze/detail/${resourceId}`);
//       console.log('Fetched resource details for editing:', response.data);
      
//       return response.data
//     } catch (err: any) {
//       console.error("Failed to fetch analysis history:", err);
//       toast({
//         title: "获取历史数据失败",
//         description: err.message || "服务器错误。",
//         variant: "destructive",
//       });
//     }
//     return null;
//   };

//   useEffect(() => {
//     if (isAuthenticated) {
//       fetchAnalysisHistory();
//     }
//   }, [isAuthenticated]);

  return {
    resources,
    isLoading,
    error,
    totalCount,
    fetchAnalysisHistory
  };
};