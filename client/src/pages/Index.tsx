import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import WordGrid from '@/components/WordGrid';
import AudioPlayer from '../components/AudioPlayer';
import AnalysisForm from '@/components/AnalysisForm';
import { useAnalysisTask } from '@/hooks/use-analysis-task';
import { AnalysisResult } from '@/types/analysisTypes';
import FlashcardMode from '@/components/FlashcardMode';
import LoadingFallback from '@/components/LoadingFallback';
import { useToast } from '@/components/ui/use-toast';
import { NavigationMode, useWordCache } from '@/hooks/use-word-cache';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { useRecentAnalysis, Submission } from '@/hooks/use-recent-analysis';
import { baseURL } from "@/lib/axios";
import { WelcomeNotification } from '@/components/WelcomeNotification';
import ShareCard from '@/components/ShareCard';
import FloatingImageCarousel from '@/components/FloatingImageCarousel';
import { useGenerateImages } from '@/hooks/use-generate-images';
import { useViewMode } from '@/hooks/use-view-mode'; // Import the new hook
import SEO from '@/components/SEO'; // Import the SEO component

import { useParams, useNavigate } from 'react-router-dom';
const Index = () => {
  const { wordSlug } = useParams<{ wordSlug: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useViewMode('grid');

  const [showQrCodeNotification, setShowQrCodeNotification] = useState(false);
  const QR_CODE_NOTIFICATION_KEY = 'last_qr_code_notification_date';
  const QR_CODE_URL = 'data:image/jpeg;base64,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'; // 固定二维码图片地址
  const {
    currentWord: wordData, // Rename for consistency with existing components
    isLoading: isWordLoading,
    error,
    isGenerating,
    queuePosition,
    fetchWord,
    updateWordImageUrls,
    updateWordCover // 需要传递给 FlashcardMode
  } = useWordCache();

  const [pageMode, setPageMode] = useState<NavigationMode>(NavigationMode.Search);

  // const [lastSearchedWord, setLastSearchedWord] = useState('');

  // Effect for initial word fetch
  useEffect(() => {
    if (pageMode !== NavigationMode.Search) {
      setPageMode(NavigationMode.Search)
      return;
    }
    fetchWord(wordSlug || '', NavigationMode.Search, viewMode === 'flashcard');
  }, [wordSlug, fetchWord, viewMode]);

  // Effect for WelcomeNotification display logic
  useEffect(() => {
    const lastShownDate = localStorage.getItem(QR_CODE_NOTIFICATION_KEY);
    if (!lastShownDate) {
      setShowQrCodeNotification(true);
    } else {
      const lastDate = new Date(lastShownDate);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 3);
      if (lastDate < sevenDaysAgo) {
        setShowQrCodeNotification(true);
      }
    }
  }, []);

  const handleSearch = useCallback((word: string) => {
    navigate(`/word/${word}`);
  }, [navigate]);

  const handleNext = useCallback(() => {
    if (wordData) {
      setPageMode(NavigationMode.Next)
      fetchWord(wordData.word_text, NavigationMode.Next, viewMode === 'flashcard').then(nextWord => {
        if (nextWord) navigate(`/word/${nextWord.word_text}`, { replace: true });
      });
    }
  }, [fetchWord, viewMode, wordData, navigate]);

  const handlePrevious = useCallback(() => {
    if (wordData) {
      setPageMode(NavigationMode.Previous)
      fetchWord(wordData.word_text, NavigationMode.Previous, viewMode === 'flashcard').then(prevWord => {
        if (prevWord) navigate(`/word/${prevWord.word_text}`, { replace: true });
      });
    }
  }, [fetchWord, viewMode, wordData, navigate]);


  // All other states and hooks that are not related to word fetching remain here
  const { toast } = useToast(); // This was removed in error, adding it back
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | undefined>(undefined);
  const [currentSubtitleContent, setCurrentSubtitleContent] = useState<string | undefined>(undefined);
  const [currentSrtResource, setCurrentSrtResource] = useState<string | undefined>(undefined);
  const [currentResource, setCurrentResource] = useState<Submission | undefined>(undefined);  
  const { getSrt, getResource } = useRecentAnalysis();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { startAnalysis, isLoading: isAnalysisLoading } = useAnalysisTask();
  const bentoGridRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [showFloatingImageCarousel, setShowFloatingImageCarousel] = useState(false);
  const [floatingCarouselWord, setFloatingCarouselWord] = useState('');
  const [floatingCarouselPosition, setFloatingCarouselPosition] = useState<DOMRect | null>(null);
  const [isImageDialogShowing, setIsImageDialogShowing] = useState(false);
  const [isExampleDialogShowing, setIsExampleDialogShowing] = useState(false);
  // Image generation state managed here and passed down to WordImageDisplay
  const { generateImages, addOrReplaceImage, isGeneratingImages, generationError } = useGenerateImages();

  const handleImageDialogStateChange = useCallback((isOpen: boolean) => {
    setIsImageDialogShowing(isOpen);
  }, []);

  const handleExampleDialogStateChange = useCallback((isOpen: boolean) => {
    setIsExampleDialogShowing(isOpen);
  }, []);

  const handleCloseAudioPlayer = useCallback(() => {
    setShowAudioPlayer(false);
    setCurrentAudioUrl(undefined);
    setCurrentSubtitleContent(undefined);
    setCurrentSrtResource(undefined);
  }, []);

  const requestGenerateImages = useCallback(async (wordText: string, example: string, force: boolean) => {
    // Trigger generation via hook and store results for child
    const urls = await generateImages(wordText, example, force);
    if (urls && urls.length > 0) {
      // 更新缓存中的数据
      updateWordImageUrls(wordText, urls);
    }
    return urls;
  }, [generateImages]);

  // --- New useEffect for Paste Event ---
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      // Check if the paste target is an input or textarea element
      const target = event.target as HTMLElement; // Cast target to HTMLElement
      const tagName = target.tagName;

      // If the target is an INPUT or TEXTAREA, do NOT trigger handleSearch
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
        // console.log("Paste event occurred in an input/textarea. Ignoring global paste handler.");
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
          // console.log("Pasted text detected:", text);
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
        // console.log("Dialog is open, keyboard navigation disabled.");
        return; // Exit the handler if any dialog is open
      }
      // Check if the user is currently typing in an input field
      // Get the active element
      const activeElement = document.activeElement;
      // Check if the active element is an input or textarea
      const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

      // If the user is typing AND the key is an arrow key, allow default behavior (cursor movement)
      if (isTyping && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        // Do nothing, let the browser handle the cursor movement within the input
        return;
      }

      // If the user is typing (but not an arrow key) or if loading, disable global navigation
      if (isTyping || isWordLoading || isAnalysisLoading) {
        return; // Exit the handler, preventing global navigation for other keys or during loading
      }

      //   // Disable keyboard navigation if word data or analysis is loading
      //   if (isWordLoading || isAnalysisLoading) {
      //       return;
      //   }

      //   // If the user is typing, do not trigger navigation
      //   if (isTyping) {
      //       return;
      //   }

      // Handle arrow key presses
      if (event.key === 'ArrowLeft') {
        event.preventDefault(); // Prevent default browser scroll behavior
        handlePrevious(); // Call the previous word handler
      } else if (event.key === 'ArrowRight') {
        event.preventDefault(); // Prevent default browser scroll behavior
        handleNext(); // Call the next word handler
      } else if (event.key === 's') {
        // 切换网格视图和卡片视图
        if (viewMode === 'grid') {
          setViewMode('flashcard')
        } else {
          setViewMode('grid')
        }
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
    // console.log("Analysis result cleared.");
  }, []); // No dependencies needed as it just sets state to null

  // 主要的 useEffect：负责获取当前单词数据
  useEffect(() => {
    if (!currentSrtResource) {
      setCurrentSubtitleContent(undefined);
      return;
    }

    const fetchCurrentWord = async (resource: string) => {
      // 使用 fetchAndCacheWord 函数来获取数据，它会先检查缓存
      const data = await getSrt(resource); // 等待数据获取或从缓存返回

      if (data) {
        setCurrentSubtitleContent(data);
      }
    };

    fetchCurrentWord(currentSrtResource);

  }, [currentSrtResource]);

  const handleManualAnalysisResult = useCallback((submission: Submission) => {
    setAnalysisResult({ words: JSON.parse(submission.words), relatedUuids: submission.relatedUuids });
    console.log("Analysis result reset manually.");

    if (submission.audioKey) {
      setCurrentAudioUrl(`${baseURL}/api/analyze/audio/${submission.uuid}`)
      setShowAudioPlayer(true);
    }
    if (submission.captionSrt) {
      setCurrentSrtResource(submission.uuid)
    } else {
      setCurrentSrtResource(undefined);
    }
  }, []); // No dependencies needed as it just sets state to null

  const handleCloseQrCodeNotification = useCallback(() => {
    setShowQrCodeNotification(false);
    localStorage.setItem(QR_CODE_NOTIFICATION_KEY, new Date().toISOString());
  }, []);

  const handleExportImage = useCallback(async () => {
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

    const htmlToImage = await import('html-to-image');

    // console.log("Attempting to capture bento grid element with html-to-image:", element);

    // 定义目标宽度，高度将根据内容动态计算
    const TARGET_WIDTH = 1080;

    // 1. 保存原始样式
    const originalStyles = {
      width: element.style.width,
      height: element.style.height,
      padding: element.style.padding,
      margin: element.style.margin,
      transform: element.style.transform,
      transformOrigin: element.style.transformOrigin,
      overflow: element.style.overflow,
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      zIndex: element.style.zIndex,
    };

    // 2. 设置临时样式 - 宽度固定，高度自动
    element.style.width = `${TARGET_WIDTH}px`;
    element.style.height = 'auto'; // 高度自适应
    element.style.padding = '24px';
    element.style.margin = '0';
    element.style.transform = 'scale(1)';
    element.style.transformOrigin = 'top left';
    element.style.overflow = 'visible'; // 改为visible确保内容完全显示
    element.style.position = 'fixed'; // 使用fixed定位避免页面滚动影响
    element.style.left = '0';
    element.style.top = '0';
    element.style.zIndex = '9999';

    // 3. 设置内部网格容器的样式
    const gridContainer = element.querySelector('.grid-container') as HTMLElement;
    let gridOriginalStyles: Record<string, string> | null = null;

    if (gridContainer) {
      gridOriginalStyles = {
        width: gridContainer.style.width,
        height: gridContainer.style.height,
        padding: gridContainer.style.padding,
        margin: gridContainer.style.margin,
        gap: gridContainer.style.gap,
        display: gridContainer.style.display,
        justifyContent: gridContainer.style.justifyContent,
        alignItems: gridContainer.style.alignItems,
        maxWidth: gridContainer.style.maxWidth,
        boxSizing: gridContainer.style.boxSizing,
        flexDirection: gridContainer.style.flexDirection,
      };

      // 设置网格容器自适应
      gridContainer.style.width = '100%';
      gridContainer.style.height = 'auto'; // 高度自适应

      // 添加对称的内边距
      gridContainer.style.padding = '0 60px';

      // 保持Flex布局确保内容居中
      gridContainer.style.display = 'flex';
      gridContainer.style.flexDirection = 'column';
      gridContainer.style.justifyContent = 'flex-start'; // 改为flex-start从顶部开始
      gridContainer.style.alignItems = 'center';
      gridContainer.style.maxWidth = '100%';
      gridContainer.style.margin = '0';
      gridContainer.style.gap = '8px';
      gridContainer.style.boxSizing = 'border-box';
    }

    // 4. 处理隐藏元素
    const elementsToHide = element.querySelectorAll('.export-hide');
    const originalDisplays: string[] = [];
    elementsToHide.forEach((el: Element) => {
      const htmlEl = el as HTMLElement;
      originalDisplays.push(htmlEl.style.display);
      htmlEl.style.display = 'none';
    });

    const carouselItemsToHide = element.querySelectorAll('.export-carousel-item');
    const originalCarouselItemDisplays: string[] = [];
    if (carouselItemsToHide.length > 1) {
      carouselItemsToHide.forEach((el: Element, index: number) => {
        if (index > 0) {
          const htmlEl = el as HTMLElement;
          originalCarouselItemDisplays.push(htmlEl.style.display);
          htmlEl.style.display = 'none';
        }
      });
    }

    try {
      // 添加延迟确保样式应用和渲染
      await new Promise(resolve => setTimeout(resolve, 200));

      // 计算动态高度
      const elementHeight = element.scrollHeight;
      // console.log(`Calculated dynamic height: ${elementHeight}px`);

      // 设置最终高度
      element.style.height = `${elementHeight}px`;

      // 再次短暂延迟确保高度设置生效
      await new Promise(resolve => setTimeout(resolve, 50));

      // 使用 html-to-image.toPng，不指定固定高度
      const imageDataUrl = await htmlToImage.toPng(element, {
        width: TARGET_WIDTH,
        height: elementHeight, // 使用动态计算的高度
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#FFFFFF',
        style: {
          backgroundColor: '#FFFFFF',
        }
      });

      // 创建下载链接
      const link = document.createElement('a');
      link.href = imageDataUrl;
      const filename = `word-bento-${wordData?.word_text || 'export'}.png`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // console.log(`Successfully exported image as ${filename} with dynamic height: ${elementHeight}px`);
      toast({
        title: "导出成功",
        description: `已将内容导出为图片 "${filename}"。`,
        variant: "default",
      });

    } catch (error: any) {
      console.error("Error capturing or exporting image:", error);
      toast({
        title: "导出失败",
        description: `导出图片时发生错误: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      // 5. 恢复所有样式
      Object.assign(element.style, originalStyles);

      // 恢复网格容器样式
      if (gridContainer && gridOriginalStyles) {
        Object.assign(gridContainer.style, gridOriginalStyles);
      }

      // 恢复隐藏元素
      elementsToHide.forEach((el: Element, index: number) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.display = originalDisplays[index];
      });

      if (carouselItemsToHide.length > 1) {
        carouselItemsToHide.forEach((el: Element, index: number) => {
          if (index > 0) {
            const htmlEl = el as HTMLElement;
            htmlEl.style.display = originalCarouselItemDisplays[index - 1];
          }
        });
      }

      // console.log("Restored all styles after export.");
    }
  }, [bentoGridRef, wordData, toast]);

  const handleExportShareImage = useCallback(async () => {
    const element = shareCardRef.current;
    if (!element) {
      console.error("Share card element not found for capture.");
      toast({
        title: "导出失败",
        description: "无法找到要导出的内容。",
        variant: "destructive",
      });
      return;
    }

    const htmlToImage = await import('html-to-image');

    const TARGET_WIDTH = 1080;

    // 1. 保存原始样式
    const originalStyles = {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      width: element.style.width,
      height: element.style.height,
      minHeight: element.style.minHeight,
      overflow: element.style.overflow,
      zIndex: element.style.zIndex,
    };

    // 2. 临时移动到可视区域（高度自适应）
    element.style.position = 'fixed';
    element.style.left = '0';
    element.style.top = '0';
    element.style.width = `${TARGET_WIDTH}px`;
    element.style.height = 'auto';
    element.style.minHeight = '1920px';
    element.style.overflow = 'visible';
    element.style.zIndex = '9999';

    try {
      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 300));

      // 计算实际高度，至少 1920
      const actualHeight = Math.max(element.scrollHeight, 1920);

      const imageDataUrl = await htmlToImage.toPng(element, {
        width: TARGET_WIDTH,
        height: actualHeight,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: '#0f172a',
        skipAutoScale: true,
      });

      const link = document.createElement('a');
      link.href = imageDataUrl;
      const filename = `share-card-${wordData?.word_text || 'export'}.png`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "导出成功",
        description: `已将分享卡片导出为图片 "${filename}"。`,
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error capturing share card:", error);
      toast({
        title: "导出失败",
        description: `导出图片时发生错误: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      // 3. 恢复原始样式（移回屏幕外）
      Object.assign(element.style, originalStyles);
    }
  }, [shareCardRef, wordData, toast]);

  // --- New callback for highlighted word click ---
  const handleHighlightedWordClick = useCallback((word: string, rect: DOMRect) => {
    setFloatingCarouselWord(word);
    setFloatingCarouselPosition(rect);
    setShowFloatingImageCarousel(true);
  }, []);

  const handleCloseFloatingCarousel = useCallback(() => {
    setShowFloatingImageCarousel(false);
    setFloatingCarouselWord('');
    setFloatingCarouselPosition(null);
  }, []);
  // --- End new callback ---

  const handleResourceClick = useCallback(async (uuid: string) => {
    // 传入
    console.log(uuid);
    const resource = await getResource(uuid); // 等待数据获取或从缓存返回
    if (resource) {
      setCurrentResource(resource);
    }
  }, []);

  // 根据加载状态、错误状态和数据状态渲染不同的内容
  const renderContent = () => {
    if (isWordLoading && !wordData) {
      return <LoadingFallback message="正在加载单词..." />;
    }

    if (error && !wordData) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 text-red-600">
            <h1 className="text-3xl font-bold mb-4">加载失败</h1>
            <p className="mb-8">{error}</p>
          </div>
        </div>
      );
    }

    if (!wordData) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-3xl font-bold mb-4">单词未找到</h1>
            <p className="text-gray-600 mb-8">
              抱歉，数据库中找不到 "{wordSlug}" 这个单词。请尝试搜索其他单词。
            </p>
          </div>
        </div>
      );
    }

    // Main content rendering
    return (
      <main className="flex-1 overflow-y-auto p-4">
        {viewMode === 'grid' ? (
          <>
            <AnalysisForm
              onSubmitAnalysis={startAnalysis}
              isWordLoading={isWordLoading}
              isAnalysisLoading={isAnalysisLoading}
              analysisResult={analysisResult}
              analysisResource={currentResource || null}
              refreshAnalysisResource={handleResourceClick}
              onWordClick={handleSearch}
              onClearAnalysisResult={handleClearAnalysisResult}
              onManualAnalysisResult={handleManualAnalysisResult}
              onWordSearch={handleSearch}
              currentWord={wordData.word_text}
            />
            <WordGrid word={wordData}
              onMasteredSuccess={handleNext}
              isWordLoading={isWordLoading}
              onPrevious={handlePrevious}
              onNext={handleNext}
              bentoGridRef={bentoGridRef}
              requestGenerateImages={requestGenerateImages}
              isImageGenerating={isGeneratingImages}
              imageGenerationError={generationError}
              onShowImageDialogChange={handleImageDialogStateChange}
              onShowExampleDialogChange={handleExampleDialogStateChange}
            />
          </>
        ) : (
          <FlashcardMode
            wordData={wordData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onShowImageDialogChange={handleImageDialogStateChange}
            onUpdateWordCover={updateWordCover}
            requestGenerateImages={requestGenerateImages}
            isGeneratingImage={isGeneratingImages}
            imageGenerationError={generationError}
            onEditImage={ addOrReplaceImage }       
          />
        )}

        {showFloatingImageCarousel && floatingCarouselPosition && wordData && (
          <FloatingImageCarousel
            wordText={floatingCarouselWord}
            position={floatingCarouselPosition}
            onSearchWord={handleSearch}
            onClose={handleCloseFloatingCarousel}
          />
        )}

        {showAudioPlayer && currentAudioUrl && (
          <AudioPlayer
            audioUrl={currentAudioUrl}
            subtitleContent={currentSubtitleContent}
            highlightWords={analysisResult?.words || []}
            relatedUuids={analysisResult?.relatedUuids || []}
            onClose={handleCloseAudioPlayer}
            onHighlightedWordClick={handleHighlightedWordClick}
            onSearchWord={handleSearch}
            onSelectResource={handleResourceClick}
          />
        )}

        {viewMode === 'grid' && (
          <>
            <style>{`
              @keyframes pdf-glow {
                0%, 100% { box-shadow: 0 0 8px rgba(251, 146, 60, 0.4); transform: scale(1); }
                50% { box-shadow: 0 0 24px rgba(251, 146, 60, 0.7); transform: scale(1.03); }
              }
              .btn-pdf-download {
                animation: pdf-glow 2s ease-in-out infinite;
              }
              .btn-pdf-download:hover {
                animation: none;
              }
            `}</style>
            <div className="container mx-auto px-4 py-4 text-right flex flex-wrap justify-end gap-2">
              <Button
                onClick={() => window.open('https://pan.quark.cn/s/d1319d3e751e', '_blank')}
                size="sm"
                className="btn-pdf-download bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 hover:from-amber-600 hover:to-orange-700 hover:shadow-lg hover:shadow-orange-500/30"
              >
                <Download className="mr-2 h-4 w-4" />
                下载「Alex@顾的SAT真题单词本」
              </Button>

              <Button
                onClick={() => window.open('https://pan.quark.cn/s/0c856301ab5e', '_blank')}
                size="sm"
                className="btn-pdf-download bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 hover:from-amber-600 hover:to-orange-700 hover:shadow-lg hover:shadow-orange-500/30"
              >
                <Download className="mr-2 h-4 w-4" />
                下载「Alex@顾的TOFEL单词本」
              </Button>

              <Button
                onClick={handleExportImage}
                variant="outline"
                size="sm"
                disabled={isWordLoading || isAnalysisLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                导出学习卡片
              </Button>
              
              <Button
                onClick={handleExportShareImage}
                variant="outline"
                size="sm"
                disabled={isWordLoading || isAnalysisLoading}
              >
                <Share2 className="mr-2 h-4 w-4" />
                导出分享卡片
              </Button>
            </div>
          </>
        )}
      </main>
    );
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <SEO 
        title={wordData ? `${wordData.word_text} - WordBento` : 'WordBento - 智能英语单词学习'}
        description={wordData?.meaning ? `${wordData.word_text}: ${wordData.meaning}` : '通过 AI 生成的图片和真实语境，让英语单词学习变得直观、有趣且高效。'}
        wordData={wordData}
      />
      <WelcomeNotification
        isOpen={showQrCodeNotification}
        onClose={handleCloseQrCodeNotification}
        title="欢迎使用 4s背单词"
        message="扫描二维码关注我们，获取更多学习资源。每天上线新单词、新音频，一起学习，一起进步！"
        qrCodeUrl={QR_CODE_URL}
      />
      {/* Hidden ShareCard for export capture */}
      {wordData && (
        <div ref={shareCardRef} style={{ position: 'fixed', left: '-9999px', top: 0, width: 1080, minHeight: 1920, height: 'auto', overflow: 'visible' }}>
          <ShareCard wordData={wordData} />
        </div>
      )}
      {isGenerating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <LoadingFallback message="正在生成中..." />
          <p className="mt-4 text-lg font-semibold">正在为您生成单词...</p>
          {queuePosition !== undefined && queuePosition > 0 && (
            <p className="text-muted-foreground">
              前方还有 {queuePosition} 个任务正在排队
            </p>
          )}
        </div>
      )}
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      {renderContent()}
    </div>
  );
};

export default Index;
