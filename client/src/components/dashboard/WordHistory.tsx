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
import { Home, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WordHistoryPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const { 
    history, 
    isHistoryLoading, 
    historyError, 
    pagination, 
    fetchWordHistory 
  } = useProfile(isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    fetchWordHistory(1, debouncedSearchTerm);
  }, [isAuthenticated, navigate, debouncedSearchTerm, fetchWordHistory]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchWordHistory(page, debouncedSearchTerm);
    }
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
            <div className="w-full max-w-sm">
              <Input
                type="search"
                placeholder="搜索单词..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
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
      </div>
    </div>
  );
};

export default WordHistoryPage;
