import { useState, useRef, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import WordGrid from '@/components/WordGrid';

import AudioPlayer from '../components/AudioPlayer'; // Import the new component
import AnalysisForm from '@/components/AnalysisForm';
import { useAnalysisTask } from '@/hooks/use-analysis-task'; // Import the new analysis task hook
import { AnalysisResult } from '@/types/analysisTypes'; // Import types

import LoadingFallback from '@/components/LoadingFallback';
import { useToast } from '@/components/ui/use-toast';
// import { Button } from '@/components/ui/button'; // Import Button for word tags
import { NavigationMode, useWordCache } from '@/hooks/use-word-cache';
import { WordDataType } from '@/types/wordTypes';
import { Button } from '@/components/ui/button'; // Import Button component
import { Download } from 'lucide-react'; // Import Download icon
import { useRecentAnalysis, Submission } from '@/hooks/use-recent-analysis';

// Import html2canvas library
import html2canvas from 'html2canvas';

const Index = () => {
  const [currentWord, setCurrentWord] = useState('');
  const [wordData, setWordData] = useState<WordDataType | null>(null);
  const [isWordLoading, setIsWordLoading] = useState(true); // 主加载状态
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // New state to manage the audio player
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | undefined>(undefined);
  const [currentSubtitleContent, setCurrentSubtitleContent] = useState<string | undefined>(undefined);

  const [currentResource, setCurrentResource] = useState<string | undefined>(undefined);

  const { getSrt } = useRecentAnalysis(false);

  // State to store the analysis result when completed
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  // Use the analysis task hook
  // This hook handles submitting the task and receiving status updates via WebSocket
  const {
    startAnalysis, // Function to start the analysis task (submits HTTP POST and opens WS)
    // cancelAnalysis, // Function to cancel the analysis task (optional, sends HTTP DELETE)
    isLoading: isAnalysisLoading, // Overall loading state (submitting or polling)
    taskStatus,       // Current status of the analysis task ('idle', 'submitting', 'connecting', 'polling', 'completed', 'failed')
    // taskId,           // ID of the analysis task (null if not yet submitted or failed)
    taskResult: hookTaskResult, // Final result from the hook when task is completed
    // error: analysisError, // Error from the hook if task failed
    // progress: analysisProgress, // Progress from the hook (if provided by backend via WS)
    // statusMessage: analysisStatusMessage, // Status message from the hook (if provided by backend via WS)
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

  // Create a ref to hold the DOM element of the bento grid within WordGrid
  const bentoGridRef = useRef<HTMLDivElement>(null);

  // 调用自定义 Hook 获取缓存相关的状态和函数
  const { wordCache, fetchAndCacheWord, addToCache, removeFromCache } = useWordCache();
 
  // --- New States for Dialog Open Status ---
  const [isImageDialogShowing, setIsImageDialogShowing] = useState(false); // <-- New state
  const [isExampleDialogShowing, setIsExampleDialogShowing] = useState(false); // <-- New state
 
  const handleImagesGenerated = useCallback((word: string) => {
      removeFromCache(word);
      console.log(`${word} has been removed from cache`);
  }, []);

  // --- New Callbacks to Update Dialog Status States ---
  const handleImageDialogStateChange = useCallback((isOpen: boolean) => {
      setIsImageDialogShowing(isOpen);
      console.log(`Image Dialog is now: ${isOpen ? 'Open' : 'Closed'}`);
  }, []);

  const handleExampleDialogStateChange = useCallback((isOpen: boolean) => {
      setIsExampleDialogShowing(isOpen);
      console.log(`Example Dialog is now: ${isOpen ? 'Open' : 'Closed'}`);
  }, []);
  // --- End New States and Callbacks ---

  const handleCloseAudioPlayer = useCallback(() => {
    setShowAudioPlayer(false);
    setCurrentAudioUrl(undefined); // Clear audio URL on close
    setCurrentSubtitleContent(undefined); // Clear subtitles on close
    // Optionally pause audio here if it's still playing
    // (You'd need to expose a pause function from AudioPlayer or manage audioRef here)
  }, []);

  // 主要的 useEffect：负责获取当前单词数据
  useEffect(() => {
    const fetchCurrentWord = async (wordSlug: string) => {
      setIsWordLoading(true); // 开始加载主单词，设置 loading 为 true
      setError(null); // 清除之前的错误信息
    //   setWordData(null); // 清除之前的单词数据（可选，取决于你希望切换时是否保留旧数据直到新数据加载）

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
        //    setWordData(null); // 确保数据为 null
      }
      setIsWordLoading(false); // 无论成功或失败，主加载结束
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
        setIsWordLoading(false); // 从缓存加载，不是 loading 状态

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
    if (isWordLoading) return; // 如果正在加载主单词，忽略点击

    setIsWordLoading(true); // 标记开始导航，设置 loading 为 true

    try {
        // // 1. 从 API 获取下一个单词的 slug
        // const response = await fetch(`/api/word/next/${currentWord}`);
        // if (!response.ok) {
        //      let errorMessage = `Failed to fetch next word slug: ${response.status} ${response.statusText}`;
        //      try { const errorBody = await response.json(); if (errorBody.message) errorMessage = errorBody.message; } catch (e) {}
        //       toast({ title: "获取下一单词失败", description: errorMessage, variant: "destructive" });
        //       setError(errorMessage);
        //       setIsWordLoading(false);
        //       return; // 提前返回
        // }
        // const data = await response.json();
        // const nextWordSlug = data.nextWordSlug;

        // if (nextWordSlug) {
            // 2. 使用 fetchAndCacheWord 来获取数据，它会自行检查缓存或从网络获取
            const nextWordData = await fetchAndCacheWord(currentWord, NavigationMode.Next); // 等待数据获取或从缓存返回

            if (nextWordData) {
                // 数据已获取 (来自缓存或网络)
                setWordData(nextWordData);
                setCurrentWord(nextWordData.word_text); // 更新 currentWord 触发预加载
                setError(null); // 清除错误
                setIsWordLoading(false); // 加载完成
            } else {
                // fetchAndCacheWord 返回 null 意味着获取数据失败 (虽然 slug 找到了)
                // setError(`无法加载下一个单词 "${nextWordSlug}".`);
                // toast({ title: "获取下一单词失败", description: `无法加载下一个单词 "${nextWordSlug}"`, variant: "destructive" });
                setError('无法加载下一个单词');
                 toast({ title: "获取下一单词失败", description: '无法加载下一个单词', variant: "destructive" });
                 setIsWordLoading(false);
            }

        // } else {
        //     // 没有下一个单词了 (API 返回 nextWordSlug: null)
        //     toast({ title: "已经是最后一个单词了", variant: "default" });
        //     setIsWordLoading(false); // 导航结束
        // }
    } catch (err) {
         // 处理网络错误获取下一个 slug
        console.error("Fetch next slug error:", err);
        toast({ title: "网络错误", description: "无法获取下一单词信息。", variant: "destructive" });
        setError("网络错误获取下一单词");
        setIsWordLoading(false);
    }
}, [currentWord, isWordLoading, toast, fetchAndCacheWord]); // 依赖 currentWord, isLoading, toast, fetchAndCacheWord


// handlePrevious 函数修改：获取 slug 后先检查缓存
const handlePrevious = useCallback(async () => {
     if (isWordLoading) return; // 如果正在加载主单词，忽略点击

     setIsWordLoading(true); // 标记开始导航，设置 loading 为 true

     try {
        //  // 1. 从 API 获取上一个单词的 slug
        //  const response = await fetch(`/api/word/previous/${currentWord}`);
        //   if (!response.ok) {
        //       let errorMessage = `Failed to fetch previous word slug: ${response.status} ${response.statusText}`;
        //       try { const errorBody = await response.json(); if (errorBody.message) errorMessage = errorBody.message; } catch (e) {}
        //       toast({ title: "获取上一单词失败", description: errorMessage, variant: "destructive" });
        //       setError(errorMessage);
        //       setIsWordLoading(false);
        //       return; // 提前返回
        //   }
        //   const data = await response.json();
        //   const previousWordSlug = data.previousWordSlug;

        //    if (previousWordSlug) {
               // 2. 使用 fetchAndCacheWord 来获取数据，它会自行检查缓存或从网络获取
               const previousWordData = await fetchAndCacheWord(currentWord, NavigationMode.Previous); // 等待数据获取或从缓存返回

               if (previousWordData) {
                    // 数据已获取
                   setWordData(previousWordData);
                   setCurrentWord(previousWordData.word_text); // 更新 currentWord 触发预加载
                   setError(null);
                   setIsWordLoading(false); // 加载完成
               } else {
                    // fetchAndCacheWord 返回 null
                   setError('无法加载上一个单词');
                   toast({ title: "获取上一单词失败", description: '无法加载上一个单词', variant: "destructive" });
                   setIsWordLoading(false);
               }
          // } else {
          //      // 没有上一个单词了
          //     toast({ title: "已经是第一个单词了", variant: "default" });
          //     setIsWordLoading(false); // 导航结束
          // }
      } catch (err) {
           // 处理网络错误获取上一个 slug
          console.error("Fetch previous slug error:", err);
          toast({ title: "网络错误", description: "无法获取上一单词信息。", variant: "destructive" });
          setError("网络错误获取上一单词");
          setIsWordLoading(false);
      }
  }, [currentWord, isWordLoading, toast, fetchAndCacheWord]); // 依赖 currentWord, isLoading, toast, fetchAndCacheWord


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

  // --- New useEffect for Keyboard Navigation ---
  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
          // Check if a dialog is currently open
          if (isImageDialogShowing || isExampleDialogShowing) { // <-- Check dialog states
              console.log("Dialog is open, keyboard navigation disabled.");
              return; // Exit the handler if any dialog is open
          }

          // Disable keyboard navigation if word data or analysis is loading
          if (isWordLoading || isAnalysisLoading) {
              return;
          }

          // Check if the user is currently typing in an input field
          // Get the active element
          const activeElement = document.activeElement;
          // Check if the active element is an input or textarea
          const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

          // If the user is typing, do not trigger navigation
          if (isTyping) {
              return;
          }

          // Handle arrow key presses
          if (event.key === 'ArrowLeft') {
              event.preventDefault(); // Prevent default browser scroll behavior
              handlePrevious(); // Call the previous word handler
          } else if (event.key === 'ArrowRight') {
              event.preventDefault(); // Prevent default browser scroll behavior
              handleNext(); // Call the next word handler
          }
      };

      // Add the event listener to the window
      window.addEventListener('keydown', handleKeyDown);

      // Clean up the event listener when the component unmounts
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [isWordLoading, isAnalysisLoading, handlePrevious, handleNext, isImageDialogShowing, isExampleDialogShowing]); // Dependencies: loading states and navigation handlers
  // --- End New useEffect for Keyboard Navigation ---
  
  // Function to clear the analysis result state
  const handleClearAnalysisResult = useCallback(() => {
    setAnalysisResult(null);
    console.log("Analysis result cleared.");
  }, []); // No dependencies needed as it just sets state to null

// 主要的 useEffect：负责获取当前单词数据
  useEffect(() => {
    if (!currentResource) return;

    const fetchCurrentWord = async (resource: string) => {
      // 使用 fetchAndCacheWord 函数来获取数据，它会先检查缓存
      const data = await getSrt(resource); // 等待数据获取或从缓存返回

      if (data) {
          setCurrentSubtitleContent(data);
      }
    };

    fetchCurrentWord(currentResource);

  }, [currentResource]);

  const handleManualAnalysisResult = useCallback((submission: Submission) => {
    setAnalysisResult({words: JSON.parse(submission.result)});
    console.log("Analysis result reset manually.");

    if (submission.audioKey) {
        setCurrentAudioUrl(`http://localhost:8787/api/analyze/audio/${submission.uuid}`)
        setShowAudioPlayer(true);
    }
    if (submission.captionSrt) {
        setCurrentResource(submission.uuid)
    }
  }, []); // No dependencies needed as it just sets state to null

   // --- New: Handle Export Image ---
    const handleExportImage = useCallback(async () => {
        // Check if the bento grid element is available via the ref
        const element = bentoGridRef.current;
        if (!element) {
            console.error("Bento grid element not found for capture.");
             toast({
                title: "导出失败",
                description: "无法找到要导出的内容。",
                variant: "destructive",
             });
            return;
        }

        console.log("Attempting to capture bento grid element:", element);

        // Find the elements to hide during export
        const elementsToHide = element.querySelectorAll('.export-hide');
        const originalDisplays: string[] = []; // Store original display styles

        // Temporarily hide the elements
        elementsToHide.forEach((el: Element) => {
            const htmlEl = el as HTMLElement; // Cast to HTMLElement to access style
            originalDisplays.push(htmlEl.style.display); // Store original style
            htmlEl.style.display = 'none'; // Hide the element
        });

        // --- New: Handle Image Sizing for Export ---
        // Find the image element(s) to adjust sizing for export
        const imageElements = element.querySelectorAll('.export-image') as NodeListOf<HTMLImageElement>;
        const originalImageStyles: {
            className: string;
            inlineStyle: string; // Store original inline style attribute value
        }[] = [];

        imageElements.forEach(imageElement => {
             // Store original className and inline style attribute value
             originalImageStyles.push({
                 className: imageElement.className,
                 inlineStyle: imageElement.style.cssText, // Get the full inline style string
             });

             // Temporarily remove existing classes and apply simple inline styles
             imageElement.className = ''; // Remove all classes
             // Apply simple styles to help html2canvas render correctly
             // Using position: static and removing transforms/margins to counteract carousel positioning
            //  imageElement.style.cssText = 'display: block; position: static; left: 0; top: 0; transform: none; margin: 0; width: auto; height: auto; max-width: 100%; max-height: none;'; // <-- Modified styles
            //  imageElement.style.cssText = 'display: block; position: static; left: auto; top: auto; transform: none; margin-left: auto; margin-right: auto; width: auto; height: auto; max-width: 100%; max-height: none;';             
            imageElement.style.cssText = 'display: block !important; position: static !important; left: auto !important; top: auto !important; transform: none !important; margin: 0 auto !important; width: auto !important; height: auto !important; max-width: 100% !important; max-height: none !important;';

             console.log(`Applied temporary styles to image for export.`);
        });
        // --- End New: Handle Image Sizing and Positioning for Export ---

        try {
            // Use html2canvas to render the element to a canvas
            const canvas = await html2canvas(element, {
                // Optional configurations for html2canvas
                // scale: 2, // Increase scale for higher resolution
                logging: true, // Enable logging for debugging
                useCORS: true, // Set to true if images are from different origins
            });

            // Convert the canvas to a data URL (PNG format by default)
            const imageDataUrl = canvas.toDataURL('image/png');

            // Create a temporary link element to trigger the download
            const link = document.createElement('a');
            link.href = imageDataUrl;
            // Set the download filename (e.g., word-bento-hurl.png)
            const filename = `word-bento-${wordData?.word_text || 'export'}.png`;
            link.download = filename;

            // Append the link to the body, click it, and then remove it
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`Successfully exported image as ${filename}`);
             toast({
                title: "导出成功",
                description: `已将内容导出为图片 "${filename}"。`,
                variant: "default",
             });

        } catch (error) {
            console.error("Error capturing or exporting image:", error);
             toast({
                title: "导出失败",
                description: `导出图片时发生错误: ${error.message}`,
                variant: "destructive",
             });
        } finally {
            // --- Restore original display styles ---
            elementsToHide.forEach((el: Element, index: number) => {
                const htmlEl = el as HTMLElement;
                htmlEl.style.display = originalDisplays[index]; // Restore original style
            });
             console.log("Restored display styles after export.");
            // --- End Restore ---

            // --- Restore original image styles ---
            imageElements.forEach((imageElement, index) => {
                 const originalStyle = originalImageStyles[index];
                 // Restore original className
                 imageElement.className = originalStyle.className;
                 // Restore original inline style attribute value
                 imageElement.style.cssText = originalStyle.inlineStyle;
            });
            console.log("Restored original image styles.");
            // --- End Restore original image styles ---
        }
    }, [bentoGridRef, wordData, toast]); // Dependencies: bentoGridRef, wordData (for filename), toast
    // --- End: Handle Export Image ---

    // 根据加载状态、错误状态和数据状态渲染不同的内容
    const renderContent = () => {
      if (isWordLoading && !wordData) {
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

      if (error && !wordData) {
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
                isWordLoading={isWordLoading}
                isAnalysisLoading={isAnalysisLoading} 
                analysisResult={analysisResult} 
                onWordClick={handleSearch} 
                onClearAnalysisResult={handleClearAnalysisResult}
                onManualAnalysisResult={handleManualAnalysisResult}
                onWordSearch={handleSearch}
                currentWord={currentWord}
              />

              <WordGrid word={wordData} 
                onMasteredSuccess={ handleNext } 
                isWordLoading={isWordLoading}
                onPrevious={handlePrevious} 
                onNext={handleNext} 
                bentoGridRef={bentoGridRef} // <-- Pass the ref here
                onImagesGenerated={handleImagesGenerated}
                onShowImageDialogChange={handleImageDialogStateChange} // <-- Pass the callback
                onShowExampleDialogChange={handleExampleDialogStateChange} // <-- Pass the callback              
              />

      {/* Conditionally render the AudioPlayer */}
      {showAudioPlayer && currentAudioUrl && (
        <AudioPlayer
          audioUrl={currentAudioUrl}
          subtitleContent={currentSubtitleContent}
          onClose={handleCloseAudioPlayer}
        />
      )}
                    {/* Export Image Button - placed above the WordGrid */}
                    <div className="container mx-auto px-4 py-4 text-right">
                        <Button
                            onClick={handleExportImage}
                            variant="outline"
                            size="sm"
                            disabled={isWordLoading || isAnalysisLoading} // Disable while loading
                        >
                            <Download className="mr-2 h-4 w-4" />
                            导出学习卡片
                        </Button>
                    </div>
           </main>
      );
  };

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Header/>
        {renderContent()} {/* 调用渲染内容的函数 */}
      </div>
    </AuthProvider>
  );
};

export default Index;