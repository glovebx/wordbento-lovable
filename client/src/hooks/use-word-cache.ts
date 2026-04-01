import { useRef, useCallback, useState, useEffect } from 'react';
import { WordDataType } from '@/types/wordTypes';
import { axiosPrivate } from "@/lib/axios";
import { AxiosError } from "axios";
import { useTaskSubscription } from './use-task-subscription';

// ... (keep WordDataType and MAX_CACHE_SIZE as they are)
const MAX_CACHE_SIZE = 20;

export enum NavigationMode {
    Search = 0,
    Next = 1,
    Previous = -1,
}

export const useWordCache = () => {
    const wordCacheRef = useRef<Map<string, WordDataType>>(new Map());
    const cacheOrderRef = useRef<string[]>([]);
    const cachePrefetchRef = useRef<string[]>([]);

    const [currentWord, setCurrentWord] = useState<WordDataType | null>(null);
    const [isMustHasImage, setIsMustHasImage] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [taskId, setTaskId] = useState<string | null>(null);

    const { taskResult } = useTaskSubscription(taskId);


    const addToCache = useCallback((slug: string, data: WordDataType) => {
        const cache = wordCacheRef.current;
        const order = cacheOrderRef.current;
        if (order.includes(slug)) {
            order.splice(order.indexOf(slug), 1);
        }
        if (cache.size >= MAX_CACHE_SIZE) {
            const oldestSlug = order.shift();
            if (oldestSlug) cache.delete(oldestSlug);
        }
        cache.set(slug, data);
        order.push(slug);
    }, []);

    const addToPrefetchCache = useCallback((slug: string) => {
        const order = cachePrefetchRef.current;
        if (order.includes(slug)) {
            return;
        }
        if (order.length >= MAX_CACHE_SIZE) {
            order.shift();
        }
        order.push(slug);
    }, []);

    const fetchWord = useCallback(async (slug: string, mode: NavigationMode, mhi: boolean) => {
        // console.log(`[useWordCache] fetchWord called with slug: '${slug}', mode: ${mode}`);
        // CRITICAL: Reset task ID at the very beginning of a new fetch operation.
        setTaskId(null);
        setIsLoading(true);
        setError(null);

        const slug_to_search = slug.trim().toLowerCase();
        setIsMustHasImage(mhi);

        // 1. Check cache first for search mode
        if (mode === NavigationMode.Search && wordCacheRef.current.has(slug_to_search)) {
            const cachedData = wordCacheRef.current.get(slug_to_search)!;
            setCurrentWord(cachedData);
            addToCache(slug_to_search, cachedData); // Update LRU
            setIsLoading(false);
            return;
        }

        let nextSlug = slug_to_search;      
        // 如果是翻页，从 cachePrefetchRef 获取试试
        if (mode !== NavigationMode.Search && cachePrefetchRef.current.includes(slug_to_search)) {
          // console.log(`Cache hit for ${slug_to_search} in prefetch cache`); // Optional logging
          // 如果缓存命中，更新其在顺序数组中的位置到末尾 (LRU)
          const prefetchRef = cachePrefetchRef.current;
          const index = prefetchRef.indexOf(slug_to_search);
          let hasNext = true;
          if (index > -1) {
            if (mode === NavigationMode.Next && (index + 1) < prefetchRef.length) {
              nextSlug = prefetchRef[index + 1];
            } else if (mode === NavigationMode.Previous && index > 0) {
              nextSlug = prefetchRef[index - 1];
            } else {
              // 没有找到，还是需要去服务器端
              hasNext = false;
            }
            if (hasNext) {
              const nextIndex = prefetchRef.indexOf(nextSlug);
              if (nextIndex > -1 && wordCacheRef.current.has(nextSlug)) {
                const cachedData = wordCacheRef.current.get(nextSlug)!; // 返回缓存数据 (使用非空断言，因为 has() 已检查存在性)
                setCurrentWord(cachedData);
                setIsLoading(false);
                return;           
              }
            }
          }
        }

        // 2. Fetch from API
        try {
            const response = await axiosPrivate.post('/api/word/search', { slug: nextSlug, mode, mhi });

            if (response.status === 202) {
                // Word generation is pending
                setTaskId(response.data.taskId);
                // isLoading remains true, UI will be handled by taskResult effect
            } else if (response.data?.content) {
                // Word found
                const data = response.data as WordDataType;
                setCurrentWord(data);
                addToCache(data.word_text, data);
                setIsLoading(false);
            } else {
                // Should not happen with 200 OK, but as a fallback
                setError(mode === NavigationMode.Search ? `'${nextSlug}' not found.`: 'No word found.');
                // setCurrentWord(null);
                setIsLoading(false);
            }
        } catch (err) {
            const message = err instanceof AxiosError ? err.response?.data?.message : 'An unknown error occurred.';
            setError(message || 'Failed to fetch word.');
            setCurrentWord(null);
            setIsLoading(false);
        }
    }, [addToCache]);

    // Effect to handle WebSocket results
    useEffect(() => {
        if (taskResult) {
            if (taskResult.status === 'completed' && taskResult.data) {
                setCurrentWord(taskResult.data);
                addToCache(taskResult.data.word_text, taskResult.data);
                setIsLoading(false);
                setTaskId(null);
            } else if (taskResult.status === 'failed') {
                setError(taskResult.error || 'Failed to generate word.');
                setCurrentWord(null);
                setIsLoading(false);
                setTaskId(null);
            }
        }
    }, [taskResult, addToCache]);

    // Effect for prefetching neighbor words
    useEffect(() => {
        if (currentWord && !taskId) {
            const prefetchNeighbors = async () => {
                // Prefetch next word
                try {
                    const response = await axiosPrivate.post('/api/word/search', { slug: currentWord.word_text, mode: NavigationMode.Next, mhi: isMustHasImage });
                    if (response.data?.content) {
                        addToCache(response.data.word_text, response.data);
                        addToPrefetchCache(response.data.word_text);
                    }
                } catch (e) {
                    console.error("Prefetch next failed:", e);
                }
            };

            prefetchNeighbors();
        }
    }, [currentWord, taskId, addToCache, isMustHasImage]);

    return {
        currentWord,
        isLoading,
        error,
        isGenerating: !!taskId,
        queuePosition: taskResult?.queuePosition,
        fetchWord,
    };
};