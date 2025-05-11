import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import WordGrid from '@/components/WordGrid';

import AnalysisForm from '@/components/AnalysisForm';
import { useAnalysisTask } from '@/hooks/use-analysis-task'; // Import the new analysis task hook
import { AnalysisResult } from '@/types/analysisTypes'; // Import types

import LoadingFallback from '@/components/LoadingFallback';
import { useToast } from '@/components/ui/use-toast';
// import { Button } from '@/components/ui/button'; // Import Button for word tags
import { useWordCache } from '@/hooks/use-word-cache';
import { WordDataType } from '@/types/wordTypes';

const Index = () => {
  const [currentWord, setCurrentWord] = useState('');
  const [wordData, setWordData] = useState<WordDataType | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 主加载状态
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // State to store the analysis result when completed
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  // Use the analysis task hook
  // This hook handles submitting the task and receiving status updates via WebSocket
  const {
    startAnalysis, // Function to start the analysis task (submits HTTP POST and opens WS)
    cancelAnalysis, // Function to cancel the analysis task (optional, sends HTTP DELETE)
    isLoading: isAnalysisLoading, // Overall loading state (submitting or polling)
    taskStatus,       // Current status of the analysis task ('idle', 'submitting', 'connecting', 'polling', 'completed', 'failed')
    taskId,           // ID of the analysis task (null if not yet submitted or failed)
    taskResult: hookTaskResult, // Final result from the hook when task is completed
    error: analysisError, // Error from the hook if task failed
    progress: analysisProgress, // Progress from the hook (if provided by backend via WS)
    statusMessage: analysisStatusMessage, // Status message from the hook (if provided by backend via WS)
} = useAnalysisTask();

  // Use a useEffect to update component's analysisResult state when hook's taskResult changes
  // This effect triggers when the hook indicates the task is completed and a result is available
  useEffect(() => {
    if (taskStatus === 'completed' && hookTaskResult) {
        setAnalysisResult(hookTaskResult);
        // TODO: You might want to clear wordData or navigate to a results view here
        // setWordData(null); // Example: Clear word data to show only analysis results
    } else if (taskStatus === 'failed' || taskStatus === 'idle') {
        // Clear analysis result if task failed or reset to idle
        // setAnalysisResult(null);
    }
}, [taskStatus, hookTaskResult]); // Dependencies: taskStatus, hookTaskResult

  // 调用自定义 Hook 获取缓存相关的状态和函数
  const { wordCache, fetchAndCacheWord, addToCache } = useWordCache();

  // 主要的 useEffect：负责获取当前单词数据
  useEffect(() => {
    const fetchCurrentWord = async (wordSlug: string) => {
      setIsLoading(true); // 开始加载主单词，设置 loading 为 true
      setError(null); // 清除之前的错误信息
      setWordData(null); // 清除之前的单词数据（可选，取决于你希望切换时是否保留旧数据直到新数据加载）

      // 使用 fetchAndCacheWord 函数来获取数据，它会先检查缓存
      const data = await fetchAndCacheWord(wordSlug); // 等待数据获取或从缓存返回

      if (data) {
          setWordData(data); // 设置获取到的单词数据 (fetchAndCacheWord 已处理缓存)
          setError(null); // 确保没有错误
      } else {
          // fetchAndCacheWord 返回 null 意味着获取失败（网络错误或 API 返回非 OK）
          // fetchAndCacheWord 内部已打印错误，这里更新组件状态并显示 toast
          setError(`无法加载单词 "${wordSlug}"。`);
           toast({
             title: "获取单词详情失败",
             description: `抱歉，无法加载单词 "${wordSlug}"。`,
             variant: "destructive",
          });
           setWordData(null); // 确保数据为 null
      }
      setIsLoading(false); // 无论成功或失败，主加载结束
    };

    fetchCurrentWord(currentWord);

    // Cleanup function (可选，用于取消 fetch 请求，需要 AbortController)
    // return () => { ... };

  }, [currentWord, toast, fetchAndCacheWord]); // 依赖 currentWord, toast, 和 fetchAndCacheWord (hook 返回的函数)

  // const handleAnalyze = async (data: AnalysisData) => {
  //   // Simulate API call with a delay
  //   await new Promise(resolve => setTimeout(resolve, 1500));
    
  //   // Show toast with the received data
  //   toast({
  //     title: "解析请求已发送",
  //     description: `资源类型: ${data.sourceType}, 考试类型: ${data.examType}`,
  //   });
    
  //   // In a real implementation, you would call your backend API here
  //   console.log("Analysis data:", data);
  // };

  // handleSearch 函数修改：检查缓存，未命中则更新 currentWord
  const handleSearch = useCallback((word: string) => {
    if (!word || word.trim() === '') {
        toast({
            title: "请输入单词",
            variant: "default",
        });
        return;
    }
    const slug = word.trim().toLowerCase();

    // 检查缓存中是否有搜索的单词
    const cachedData = wordCache.get(slug); // 使用 hook 返回的 wordCache Map

    if (cachedData) {
        // console.log(`Cache hit for search: ${slug}`); // Optional logging
        // 缓存命中：直接更新状态显示缓存数据
        setWordData(cachedData);
        setCurrentWord(slug); // 更新 currentWord 触发预加载新的前/后单词
        setError(null);
        setIsLoading(false); // 从缓存加载，不是 loading 状态

         // 将此单词在缓存顺序中移到末尾 (LRU)
         addToCache(slug, cachedData); // 使用 hook 返回的 addToCache

    } else {
       // console.log(`Cache miss for search: ${slug}, triggering fetch`); // Optional logging
       // 缓存未命中：更新 currentWord，触发主 useEffect 从 API 获取
       setCurrentWord(slug);
       // isLoading 会在 main useEffect 开始时设置为 true
    }

  }, [toast, wordCache, addToCache]); // 依赖 toast, wordCache (用于 get), addToCache (用于更新缓存顺序)


  // handleNext 函数修改：获取 slug 后先检查缓存
  const handleNext = useCallback(async () => {
    if (isLoading) return; // 如果正在加载主单词，忽略点击

    setIsLoading(true); // 标记开始导航，设置 loading 为 true

    try {
        // // 1. 从 API 获取下一个单词的 slug
        // const response = await fetch(`/api/word/next/${currentWord}`);
        // if (!response.ok) {
        //      let errorMessage = `Failed to fetch next word slug: ${response.status} ${response.statusText}`;
        //      try { const errorBody = await response.json(); if (errorBody.message) errorMessage = errorBody.message; } catch (e) {}
        //       toast({ title: "获取下一单词失败", description: errorMessage, variant: "destructive" });
        //       setError(errorMessage);
        //       setIsLoading(false);
        //       return; // 提前返回
        // }
        // const data = await response.json();
        // const nextWordSlug = data.nextWordSlug;

        // if (nextWordSlug) {
            // 2. 使用 fetchAndCacheWord 来获取数据，它会自行检查缓存或从网络获取
            const nextWordData = await fetchAndCacheWord(currentWord, 1); // 等待数据获取或从缓存返回

            if (nextWordData) {
                // 数据已获取 (来自缓存或网络)
                setWordData(nextWordData);
                setCurrentWord(nextWordData.word_text); // 更新 currentWord 触发预加载
                setError(null); // 清除错误
                setIsLoading(false); // 加载完成
            } else {
                // fetchAndCacheWord 返回 null 意味着获取数据失败 (虽然 slug 找到了)
                // setError(`无法加载下一个单词 "${nextWordSlug}".`);
                // toast({ title: "获取下一单词失败", description: `无法加载下一个单词 "${nextWordSlug}"`, variant: "destructive" });
                setError('无法加载下一个单词');
                 toast({ title: "获取下一单词失败", description: '无法加载下一个单词', variant: "destructive" });
                 setIsLoading(false);
            }

        // } else {
        //     // 没有下一个单词了 (API 返回 nextWordSlug: null)
        //     toast({ title: "已经是最后一个单词了", variant: "default" });
        //     setIsLoading(false); // 导航结束
        // }
    } catch (err) {
         // 处理网络错误获取下一个 slug
        console.error("Fetch next slug error:", err);
        toast({ title: "网络错误", description: "无法获取下一单词信息。", variant: "destructive" });
        setError("网络错误获取下一单词");
        setIsLoading(false);
    }
}, [currentWord, isLoading, toast, fetchAndCacheWord]); // 依赖 currentWord, isLoading, toast, fetchAndCacheWord


// handlePrevious 函数修改：获取 slug 后先检查缓存
const handlePrevious = useCallback(async () => {
     if (isLoading) return; // 如果正在加载主单词，忽略点击

     setIsLoading(true); // 标记开始导航，设置 loading 为 true

     try {
        //  // 1. 从 API 获取上一个单词的 slug
        //  const response = await fetch(`/api/word/previous/${currentWord}`);
        //   if (!response.ok) {
        //       let errorMessage = `Failed to fetch previous word slug: ${response.status} ${response.statusText}`;
        //       try { const errorBody = await response.json(); if (errorBody.message) errorMessage = errorBody.message; } catch (e) {}
        //       toast({ title: "获取上一单词失败", description: errorMessage, variant: "destructive" });
        //       setError(errorMessage);
        //       setIsLoading(false);
        //       return; // 提前返回
        //   }
        //   const data = await response.json();
        //   const previousWordSlug = data.previousWordSlug;

        //    if (previousWordSlug) {
               // 2. 使用 fetchAndCacheWord 来获取数据，它会自行检查缓存或从网络获取
               const previousWordData = await fetchAndCacheWord(currentWord, -1); // 等待数据获取或从缓存返回

               if (previousWordData) {
                    // 数据已获取
                   setWordData(previousWordData);
                   setCurrentWord(previousWordData.word_text); // 更新 currentWord 触发预加载
                   setError(null);
                   setIsLoading(false); // 加载完成
               } else {
                    // fetchAndCacheWord 返回 null
                   setError('无法加载上一个单词');
                   toast({ title: "获取上一单词失败", description: '无法加载上一个单词', variant: "destructive" });
                   setIsLoading(false);
               }
          // } else {
          //      // 没有上一个单词了
          //     toast({ title: "已经是第一个单词了", variant: "default" });
          //     setIsLoading(false); // 导航结束
          // }
      } catch (err) {
           // 处理网络错误获取上一个 slug
          console.error("Fetch previous slug error:", err);
          toast({ title: "网络错误", description: "无法获取上一单词信息。", variant: "destructive" });
          setError("网络错误获取上一单词");
          setIsLoading(false);
      }
  }, [currentWord, isLoading, toast, fetchAndCacheWord]); // 依赖 currentWord, isLoading, toast, fetchAndCacheWord


    // --- New useEffect for Paste Event ---
    useEffect(() => {
      const handlePaste = (event: ClipboardEvent) => {
          // Check if the paste target is an input or textarea element
          const target = event.target as HTMLElement; // Cast target to HTMLElement
          const tagName = target.tagName;

          // If the target is an INPUT or TEXTAREA, do NOT trigger handleSearch
          if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
              console.log("Paste event occurred in an input/textarea. Ignoring global paste handler.");
              return; // Exit the handler
          }
                  
          // Check if the pasted content is plain text
          const pastedText = event.clipboardData?.getData('text/plain');

          if (pastedText) {
              const text = pastedText.trim();
              // Regex to check if the string contains ONLY letters from any language (Unicode property \p{L})
              // This implicitly excludes numbers, spaces, and most symbols/punctuation.
              // The 'u' flag is necessary for Unicode property escapes (\p{...}).
              const lettersOnlyRegex = /^[\p{L}]+$/u;

              // 使用 test() 方法检查字符串是否匹配正则表达式
              if (lettersOnlyRegex.test(text)) {
                // Prevent the default paste action if you want to handle it exclusively
                // event.preventDefault();
                console.log("Pasted text detected:", text);
                // Call handleSearch with the pasted text
                handleSearch(text);                
              }
          }
      };

      // Add the event listener to the window
      window.addEventListener('paste', handlePaste);

      // Clean up the event listener when the component unmounts
      return () => {
          window.removeEventListener('paste', handlePaste);
      };
  }, [handleSearch]); // Dependency: handleSearch function  

    // Function to clear the analysis result state
    const handleClearAnalysisResult = useCallback(() => {
      setAnalysisResult(null);
      console.log("Analysis result cleared.");
  }, []); // No dependencies needed as it just sets state to null

    // 根据加载状态、错误状态和数据状态渲染不同的内容
    const renderContent = () => {
      if (isLoading && !wordData) {
          // 初始加载 或 切换单词时正在加载且旧数据已清除
          return (
              // <div className="flex-1 flex items-center justify-center">
              //     <div className="text-center p-8">
              //         <div className="animate-spin rounded-full h-12 w-12 border-4 border-dashed border-blue-500 mx-auto mb-4"></div>
              //         <p className="text-lg text-gray-600">正在加载单词...</p>
              //     </div>
              // </div>
              <LoadingFallback message="正在加载单词..." />
          );
      }

      if (error) {
          // 显示错误信息
           return (
              <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-8 text-red-600">
                      <h1 className="text-3xl font-bold mb-4">加载失败</h1>
                      <p className="mb-8">{error}</p>
                       {/* 可以添加重试按钮或搜索框 */}
                  </div>
              </div>
          );
      }

      if (!wordData) {
          // 没有加载中，没有错误，但也没有数据
          return (
               <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-8">
                      <h1 className="text-3xl font-bold mb-4">单词未找到</h1>
                      <p className="text-gray-600 mb-8">
                        抱歉，数据库中找不到 "{currentWord}" 这个单词。请尝试搜索其他单词。
                      </p>
                       {/* 可以添加一个搜索框在这里 */}
                  </div>
              </div>
          );
      }

      // 数据加载成功，显示 WordGrid
      return (
           <main className="flex-1">
              <AnalysisForm 
              onSubmitAnalysis={startAnalysis} 
              isLoading={isAnalysisLoading} 
              analysisResult={analysisResult} 
              onWordClick={handleSearch} 
              onClearAnalysisResult={handleClearAnalysisResult}/>

              <WordGrid word={wordData} onMasteredSuccess={ handleNext } />
           </main>
      );
  };

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Header
          onSearch={handleSearch}
          onNext={handleNext}
          onPrevious={handlePrevious}
          currentWord={currentWord}
          // 可以在 Header 中禁用前进/后退按钮，如果在加载主单词数据时
          disableNav={isLoading} // 仍然使用 isLoading 来禁用导航，避免重复点击
        />
        {renderContent()} {/* 调用渲染内容的函数 */}
      </div>
    </AuthProvider>
  );
};

export default Index;