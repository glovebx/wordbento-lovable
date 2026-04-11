import { useState, useEffect } from 'react';

export type ViewMode = 'grid' | 'flashcard';

const VIEW_MODE_STORAGE_KEY = 'app_view_mode';

export const useViewMode = (defaultMode: ViewMode = 'grid') => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null;
    return savedMode || defaultMode;
  });

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  return [viewMode, setViewMode] as const;
};
