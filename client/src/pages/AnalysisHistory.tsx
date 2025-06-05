import { useState, useCallback, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Home, Loader2, PlusCircle } from "lucide-react";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { MobileNavigation } from "@/components/profile/MobileNavigation";
import { HistoryTable } from "@/components/history/HistoryTable";
import { EditResourceDialog } from "@/components/history/EditResourceDialog";
import { useHistoryData } from "@/hooks/useHistoryData";
import { ResourceWithAttachments } from "@/types/database"; // 导入两种类型
import { axiosPrivate } from "@/lib/axios"; // 导入 axiosPrivate 用于获取单个资源详情

const AnalysisHistory = () => {
  const { user, isAuthenticated, refreshSession } = useAuth();
  const [activeSection] = useState<string>("history");
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<ResourceWithAttachments | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddingNewResource, setIsAddingNewResource] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isMobile = useIsMobile();

  const [currentPage, setCurrentPage] = useState(1); // 新增当前页码状态
  const itemsPerPage = 20; // 每页条数

  // useHistoryData 现在返回 totalCount，并接受 page 和 limit
  const { resources, isLoading, totalCount, fetchAnalysisHistory } = useHistoryData();

  // 当 currentPage 改变时，重新获取历史数据
  useEffect(() => {
    if (isAuthenticated) {
        fetchAnalysisHistory(currentPage, itemsPerPage);
    }
  }, [currentPage, isAuthenticated]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // handleEditResource 现在需要获取单个资源的完整详情
  const handleEditResource = useCallback(async (resourceId: number) => {
    setIsEditDialogOpen(true); // 立即打开对话框，显示加载状态
    setIsAddingNewResource(false);
    setEditingResource(null); // 清空旧数据，防止闪烁

    try {
      // 调用新的 /resource/:id 端点获取完整资源详情
      const response = await axiosPrivate.get<ResourceWithAttachments>(`/api/analyze/detail/${resourceId}`);
      console.log('Fetched resource details for editing:', response.data);
      setEditingResource(response.data);
    } catch (error) {
      console.error('Failed to fetch resource details for editing:', error);
      toast({
        title: "加载失败",
        description: "无法加载资源详情进行编辑。",
        variant: "destructive",
      });
      setIsEditDialogOpen(false); // 加载失败则关闭对话框
    }
  }, [toast]);


  const handleAddNewResource = useCallback(() => {
    setEditingResource(null);
    setIsAddingNewResource(true);
    setIsEditDialogOpen(true);
  }, []);

  const handleReSyncResource = async (resourceId: number) => {
    setIsSyncing(true);
    try {
    //   if (resourceId) {
        console.log('ReSync resource:', resourceId);
        // TODO: 调用后端 API 更新资源
        await axiosPrivate.put(`/api/analyze/resync/${resourceId}`);
        toast({ title: "同步成功", description: "资源信息已更新。" });
    //   } else {
        // console.log('Invalid resource id:', resourceId);
        // TODO: 调用后端 API 创建新资源
        // const response = await axiosPrivate.post('/api/analyze/resource', updatedData);
        // toast({ title: "创建成功", description: "新资源已添加。" });
    //   }

      fetchAnalysisHistory(currentPage, itemsPerPage); // 刷新当前页数据
    //   setIsEditDialogOpen(false);
    //   setIsAddingNewResource(false);
    // 重新获取详细数据
      const response = await axiosPrivate.get<ResourceWithAttachments>(`/api/analyze/detail/${resourceId}`);
      console.log('Fetched resource details for editing:', response.data);
      setEditingResource(response.data);    
    } catch (error) {
      console.error('Failed to resync resource:', error);
      toast({
        title: "操作失败",
        description: "同步资源时发生错误。",
        variant: "destructive",
      });
    } finally {
        setIsSyncing(false);
    }
  };

  const handleSaveResource = async (updatedData: Partial<ResourceWithAttachments>) => {
    try {
      if (updatedData.id) {
        console.log('Updating resource:', updatedData);
        // TODO: 调用后端 API 更新资源
        // await axiosPrivate.put(`/api/analyze/resource/${updatedData.id}`, updatedData);
        toast({ title: "更新成功", description: "资源信息已更新。" });
      } else {
        console.log('Creating new resource:', updatedData);
        // TODO: 调用后端 API 创建新资源
        // const response = await axiosPrivate.post('/api/analyze/resource', updatedData);
        toast({ title: "创建成功", description: "新资源已添加。" });
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟 API 延迟

      fetchAnalysisHistory(currentPage, itemsPerPage); // 刷新当前页数据
      setIsEditDialogOpen(false);
      setIsAddingNewResource(false);
    } catch (error) {
      console.error('Failed to save resource:', error);
      toast({
        title: "操作失败",
        description: "保存资源时发生错误。",
        variant: "destructive",
      });
    }
  };

  const handleDeleteResource = async (resourceId: number) => {
    console.log('Deleting resource:', resourceId);
    try {
      // TODO: 调用后端 API 删除资源
      // await axiosPrivate.delete(`/api/analyze/resource/${resourceId}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟 API 延迟
      toast({
        title: "删除成功",
        description: `记录 ID: ${resourceId} 已删除。`,
      });
      // 删除后，如果当前页只剩一条数据且不是第一页，则跳转到上一页
      if (resources.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        fetchAnalysisHistory(currentPage, itemsPerPage); // 刷新当前页数据
      }
    } catch (error) {
      console.error('Failed to delete resource:', error);
      toast({
        title: "删除失败",
        description: `删除记录 ID: ${resourceId} 时发生错误。`,
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarSrc(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

//   if (!isAuthenticated) {
//     return <Navigate to="/" />;
//   }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-svh w-full">
        <ProfileSidebar
          username={user?.username}
          avatarSrc={avatarSrc}
          activeSection={activeSection}
          onSelectSection={() => {}}
          onAvatarUpload={handleAvatarUpload}
          variant="history"
        />
        
        <SidebarInset>
          <div className="p-6 relative">
            <div className="absolute top-4 right-4 z-30">
              <Button variant="outline" asChild>
                <Link to="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
            
            {isMobile && (
              <MobileNavigation 
                activeSection={activeSection} 
                onSelectSection={() => {}} 
              />
            )}
            
            <div className="mt-12">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>解析历史</CardTitle>
                  <Button onClick={handleAddNewResource} size="sm" className="flex items-center gap-1">
                    <PlusCircle className="h-4 w-4" />
                    新增
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">加载中...</span>
                    </div>
                  ) : resources.length === 0 && totalCount === 0 ? ( // 增加 totalCount 判断，确保不是因为加载中而为空
                    <div className="text-center py-8 text-muted-foreground">
                      暂无解析历史记录
                    </div>
                  ) : (
                    <HistoryTable
                      resources={resources}
                      onEditResource={handleEditResource}
                      onDeleteResource={handleDeleteResource}
                      totalCount={totalCount}
                      currentPage={currentPage}
                      onPageChange={handlePageChange}
                      itemsPerPage={itemsPerPage}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </div>

      <EditResourceDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setIsAddingNewResource(false);
          }
        }}
        onReSync={handleReSyncResource}
        isSyncing={isSyncing}
        resource={isAddingNewResource ? null : editingResource}
        onSave={handleSaveResource}
      />
    </SidebarProvider>
  );
};

export default AnalysisHistory;
