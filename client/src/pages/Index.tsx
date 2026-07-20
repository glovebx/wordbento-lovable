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
  const QR_CODE_URL = 'alex-qr.jpg'; // 固定二维码图片地址
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

  // const [lastSearchedWord, setLastSearchedWord] = useState('');

  // Effect for initial word fetch
  useEffect(() => {
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
      fetchWord(wordData.word_text, NavigationMode.Next, viewMode === 'flashcard').then(nextWord => {
        if (nextWord) navigate(`/word/${nextWord.word_text}`, { replace: true });
      });
    }
  }, [fetchWord, viewMode, wordData, navigate]);

  const handlePrevious = useCallback(() => {
    if (wordData) {
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
  const { generateImages, isGeneratingImages, generationError } = useGenerateImages();

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
            isImageGenerating={isGeneratingImages}
            imageGenerationError={generationError}            
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
