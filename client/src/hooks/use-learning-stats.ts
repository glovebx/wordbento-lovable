import { useState, useCallback, useEffect } from 'react';
import { axiosPrivate } from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface DailyCount {
  date: string;
  count: number;
}

export interface LearningStatsData {
  today: number;
  yesterday: number;
  dailyCounts: DailyCount[];
  rank: number;
  totalUsers: number;
}

export const useLearningStats = () => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<LearningStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStats = useCallback(async (days: 7 | 15 | 30) => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get<LearningStatsData>('/api/statistics/summary', {
        params: { days },
      });
      setStats(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({ title: "Failed to load statistics", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, toast]);

  useEffect(() => {
    // Fetch with default period (e.g., 7 days) on initial load
    fetchStats(7);
  }, [fetchStats]);

  return { stats, isLoading, error, fetchStats };
};