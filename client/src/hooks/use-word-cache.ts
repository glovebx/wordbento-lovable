import { useRef, useCallback } from 'react';
import { WordDataType } from '@/types/wordTypes';
import { axiosPrivate } from "@/lib/axios";

// // 定义获取到的单词数据的类型
// // 建议将这个接口放在一个共享的文件中（如 src/types/wordTypes.ts）
// // 如果已经有共享文件，请在这里进行导入
// interface WordDataType {
//   word_text: string;
//   phonetic?: string;
//   content: {
//     [contentType: string]: {
//       [languageCode: string]: string | string[] | null; // 允许内容为 null 或 undefined
//     };
//   };
//   // ... 其他字段
// }

// 定义缓存的最大单词数量
const MAX_CACHE_SIZE = 20;

/**
 * Defines the different modes for navigating between words.
 */
export enum NavigationMode {
    /**
     * Represents a search operation (typically initiated by user input).
     * Corresponds to mode 0.
     */
    Search = 0,
  
    /**
     * Represents navigating to the next word in a sequence.
     * Corresponds to mode 1.
     */
    Next = 1,
  
    /**
     * Represents navigating to the previous word in a sequence.
     * Corresponds to mode -1.
     */
    Previous = -1,
  }

export const useWordCache = () => {
  // 使用 useRef 创建缓存 Map 和顺序数组
  // useRef 创建的值在组件的整个生命周期中是持久的，不会在重新渲染时丢失
  const wordCacheRef = useRef<Map<string, WordDataType>>(new Map());
  const cacheOrderRef = useRef<string[]>([]); // 用于追踪缓存键的顺序，实现简单的LRU（最近最少使用）策略

  // Helper function to add/update cache and manage size
  // 使用 useCallback 确保函数引用稳定，避免不必要的重新创建
  const addToCache = useCallback((slug: string, data: WordDataType) => {
      const cache = wordCacheRef.current;
      const order = cacheOrderRef.current;

      // 如果 item 已经存在于缓存中，先从顺序数组中移除其旧位置
      const existingIndex = order.indexOf(slug);
      if (existingIndex > -1) {
          order.splice(existingIndex, 1); // 从原位置移除
      } else if (cache.size >= MAX_CACHE_SIZE) {
          // 缓存已满且是新项，移除最老的（位于顺序数组开头）
          const oldestSlug = order.shift(); // 移除并获取数组第一个元素 (FIFO/简单LRU)
          if (oldestSlug && cache.has(oldestSlug)) {
               cache.delete(oldestSlug); // 从 Map 中删除
               // console.log(`Cache full, evicted: ${oldestSlug}`); // Optional logging
          }
      }

      // 添加/更新数据到缓存，并将其 slug 添加到顺序数组末尾（使其成为最近使用的）
      cache.set(slug, data);
      order.push(slug);

      // Optional: Log cache state for debugging
      // console.log("Cache size:", cache.size, "Order:", order.join(', '));

  }, []); // 此函数不依赖组件的状态或props，只依赖 useRef 创建的稳定引用，故依赖数组为空

  // Helper function to check cache or fetch data from API, then add to cache
  // 这个函数是核心，负责检查缓存，如果未命中则从 API 获取，成功后添加到缓存
  const fetchAndCacheWord = useCallback(async (slug: string, mode = NavigationMode.Search): Promise<WordDataType | null> => {
      const cache = wordCacheRef.current;

      // 1. 检查缓存
      if (mode === NavigationMode.Search && slug.length > 0 && cache.has(slug)) {
          // console.log(`Cache hit for ${slug}`); // Optional logging
          // 如果缓存命中，更新其在顺序数组中的位置到末尾 (LRU)
          const order = cacheOrderRef.current;
          const index = order.indexOf(slug);
           if (index > -1) {
               order.splice(index, 1);
               order.push(slug);
           }
          return cache.get(slug)!; // 返回缓存数据 (使用非空断言，因为 has() 已检查存在性)
      }

      // console.log(`Cache miss for ${slug}, fetching...`); // Optional logging
      // 2. 缓存未命中，从 API 获取数据
      try {
        //   const response = await fetch(`/api/word/${slug}`);
        const response = await axiosPrivate.post('/api/word/search', JSON.stringify({ slug: slug, mode: mode }));
        console.log('Response headers:', response.headers);
        console.log('Response body:', response.data);

        if (response.data?.content) {
            const data = response.data as WordDataType
            // console.log('User authenticated:', response.data.word);
            addToCache(data.word_text, data); // 将获取到的数据添加到缓存
            return data; // 返回获取到的数据
        } else {
            console.log('No user data found.');            
          return null;
        }
      } catch (err) {
          // 网络错误
          console.error(`Network error fetching word "${slug}":`, err);
          return null; // 获取失败返回 null
      }
  }, [addToCache]); // fetchAndCacheWord 依赖于 addToCache 函数

  // Hook 返回组件需要用到的缓存相关功能
  return {
    wordCache: wordCacheRef.current, // 返回缓存 Map 实例，供组件直接进行 contains 检查和 get 操作
    fetchAndCacheWord, // 返回获取并缓存单词的函数
    addToCache, // 返回添加到缓存的函数，以防组件在别处获取数据后想手动添加到缓存（例如初始加载或搜索成功后）
  };
};