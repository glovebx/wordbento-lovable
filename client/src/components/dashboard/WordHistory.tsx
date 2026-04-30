import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/use-profile';
import { WordHistoryTable } from '@/components/history/WordHistoryTable';
import { Pagination } from '@/components/Pagination';
import LoadingFallback from '@/components/LoadingFallback';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Home, Loader2, FileDown, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePdfExporter } from '@/hooks/use-pdf-exporter';
import { useEinkStatus } from '@/hooks/use-llm';
import { useEinkPusher } from '@/hooks/use-eink-pusher';
import { axiosPrivate } from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';
import EnlargedImageCarouselDialog from '@/components/EnlargedImageCarouselDialog';

const WordHistoryPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const { isExporting, exportToPdf } = usePdfExporter();
  const { toast } = useToast();

  // Eink Pusher State and Hooks
  const { isEinkConfigured, einkEndpoint, einkToken } = useEinkStatus(isAuthenticated);
  const { isPushing, pushImage } = useEinkPusher({ einkEndpoint, einkToken });
  const [isFetchingReviewImages, setIsFetchingReviewImages] = useState(false);
  const [pushImageUrls, setPushImageUrls] = useState<string[]>([]);
  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
  const [currentPushImageIndex, setCurrentPushImageIndex] = useState(0);
  
  const { 
    history, 
    isHistoryLoading, 
    historyError, 
    pagination, 
    fetchWordHistory 
  } = useProfile(isAuthenticated);

  const handleFetchReviewImages = async () => {
    setIsFetchingReviewImages(true);
    try {
      const response = await axiosPrivate.post<string[]>('/api/word/review/push');
      if (response.data && response.data.length > 0) {
        setPushImageUrls(response.data);
        setCurrentPushImageIndex(0); // Reset index
        setIsPushDialogOpen(true);
      } else {
        toast({ title: "没有可推送的图片", description: "无法获取最近浏览单词的图片。" });
      }
    } catch (error) {
      console.error("获取推送图片失败:", error);
      toast({ title: "获取图片失败", description: "无法从服务器获取图片列表。", variant: "destructive" });
    } finally {
      setIsFetchingReviewImages(false);
    }
  };

  const handlePushToEink = () => {
    if (pushImageUrls.length > 0) {
      const imageUrlToPush = pushImageUrls[currentPushImageIndex];
      pushImage(imageUrlToPush);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    fetchWordHistory(1, debouncedSearchTerm);
  }, [isAuthenticated, navigate, debouncedSearchTerm, fetchWordHistory]);

  useEffect(() => {
    // Preload the PDF generation libraries in the background
    // after the main page content has likely loaded, to improve
    // the perceived performance of the PDF export button.
    const timer = setTimeout(() => {
      import('@react-pdf/renderer');
      import('@/components/pdf/PdfDocument');
    }, 3000); // 3-second delay

    return () => clearTimeout(timer);
  }, []); // Run only once when the component mounts

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchWordHistory(page, debouncedSearchTerm);
    }
  };

  const handleExport = () => {
    const wordsToExport = history.slice(0, 10);
    exportToPdf(wordsToExport, 'word-history');
  };

  if (!user && !isAuthenticated) {
    return <LoadingFallback message="Redirecting..." />;
  }

  if (historyError) {
    return <div className="text-center text-red-500 py-10">Error: {historyError}</div>;
  }

  const hasHistory = history.length > 0;
  const showNoResultsMessage = !hasHistory && debouncedSearchTerm;

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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>浏览历史</CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleExport} disabled={isExporting || history.length === 0}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                导出为PDF
              </Button>
              <Button onClick={handleFetchReviewImages} disabled={isFetchingReviewImages || !isEinkConfigured}>
                {isFetchingReviewImages ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                推送到 E-ink
              </Button>
              <div className="w-full max-w-sm">
                <Input
                  type="search"
                  placeholder="搜索单词..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isHistoryLoading && !hasHistory ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">加载中...</span>
              </div>
            ) : !hasHistory && !showNoResultsMessage ? (
              <div className="text-center py-8 text-muted-foreground">
                您还没有任何浏览记录。
              </div>
            ) : !hasHistory && showNoResultsMessage ? (
              <div className="text-center py-8 text-muted-foreground">
                找不到与 “{debouncedSearchTerm}” 相关的记录。
              </div>
            ) : (
              <>
                <WordHistoryTable history={history} />
                <Pagination 
                  currentPage={pagination.currentPage} 
                  totalPages={pagination.totalPages} 
                  onPageChange={handlePageChange} 
                />
              </>
            )}
          </CardContent>
        </Card>

        {isPushDialogOpen && (
          <EnlargedImageCarouselDialog
            open={isPushDialogOpen}
            onOpenChange={setIsPushDialogOpen}
            imageUrls={pushImageUrls}
            wordText="推送预览"
            initialIndex={0}
            onIndexChange={setCurrentPushImageIndex}
            showPushButton={true}
            isPushing={isPushing}
            onPush={handlePushToEink}
          />
        )}

      </div>
    </div>
  );
};

export default WordHistoryPage;
