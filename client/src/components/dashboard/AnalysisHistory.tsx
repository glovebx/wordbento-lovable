import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Loader2, PlusCircle } from "lucide-react";
import { HistoryTable } from "@/components/history/HistoryTable";
import { EditResourceDialog } from "@/components/history/EditResourceDialog";
import { useHistoryData } from "@/hooks/useHistoryData";
import { ResourceWithAttachments } from "@/types/database";
import { axiosPrivate } from "@/lib/axios";

// 移除不必要的 props 和状态
const AnalysisHistory = () => {
  const { isAuthenticated } = useAuth();
  const [editingResource, setEditingResource] = useState<ResourceWithAttachments | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddingNewResource, setIsAddingNewResource] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { resources, isLoading, totalCount, fetchAnalysisHistory } = useHistoryData();

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalysisHistory(currentPage, itemsPerPage);
    }
  }, [currentPage, isAuthenticated]);

  const handleEditResource = useCallback(async (resourceId: number) => {
    setIsEditDialogOpen(true);
    setIsAddingNewResource(false);
    setEditingResource(null);

    try {
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
      setIsEditDialogOpen(false);
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
      console.log('ReSync resource:', resourceId);
      await axiosPrivate.put(`/api/analyze/resync/${resourceId}`);
      toast({ title: "同步成功", description: "资源信息已更新。" });

      fetchAnalysisHistory(currentPage, itemsPerPage);
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
        toast({ title: "更新成功", description: "资源信息已更新。" });
      } else {
        console.log('Creating new resource:', updatedData);
        toast({ title: "创建成功", description: "新资源已添加。" });
      }
      await new Promise(resolve => setTimeout(resolve, 500));

      fetchAnalysisHistory(currentPage, itemsPerPage);
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
      await axiosPrivate.delete(`/api/analyze/detail/${resourceId}`);
      toast({
        title: "删除成功",
        description: `记录 ID: ${resourceId} 已删除。`,
      });
      if (resources.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        fetchAnalysisHistory(currentPage, itemsPerPage);
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

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 移除所有侧边栏相关的 UI 代码，只保留 Card 内容
  return (
    <div className="p-6 relative">
      <div className="absolute top-4 right-4 z-30">
        <Button variant="outline" asChild>
          <Link to="/" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

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
            ) : resources.length === 0 && totalCount === 0 ? (
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
    </div>
  );
};

export default AnalysisHistory;
