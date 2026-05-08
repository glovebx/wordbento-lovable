// components/AnalysisForm.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { useIsMobile } from '@/hooks/use-mobile';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, XCircle, Search } from 'lucide-react';
import { useInView } from 'react-intersection-observer'; // For infinite scroll
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import LoadingFallback from '@/components/LoadingFallback';
import { AnalysisData, AnalysisResult } from '@/types/analysisTypes';
import { useRecentAnalysis, Submission } from '@/hooks/use-recent-analysis'; // Make sure Submission is imported
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

const analysisFormSchema = z.object({
  sourceType: z.enum(['url', 'article'], {
    error: "请选择资源类型。", // 当 sourceType 字段缺失时显示
  }),
  content: z.string().min(1, {
    error: "内容不能为空。",
  }),
  examType: z.string().min(1, {
    error: "请选择考试类型。",
  })  
});

interface AnalysisFormProps {
  onSubmitAnalysis: (data: AnalysisData) => void;
  isWordLoading: boolean;
  isAnalysisLoading: boolean;
  analysisResult: AnalysisResult | null;
  analysisResource: Submission | null;
  refreshAnalysisResource: (uuid: string) => void;
  onWordClick: (word: string, examType: string) => void;
  onClearAnalysisResult: () => void;  
  onManualAnalysisResult: (submission: Submission) => void;
  onWordSearch: (word: string) => void;
  currentWord: string;  
}

const AnalysisForm: React.FC<AnalysisFormProps> = ({ 
  onSubmitAnalysis, 
  isWordLoading, 
  isAnalysisLoading, 
  analysisResult, 
  analysisResource,
  refreshAnalysisResource,
  onWordClick, 
  onClearAnalysisResult, 
  onManualAnalysisResult, 
  onWordSearch, 
  currentWord }) => {

    const { isAuthenticated } = useAuth();  
    const isMobile = useIsMobile();

  const [sourceType, setSourceType] = useState<'url' | 'article'>('url');
  const [searchInput, setSearchInput] = useState('');
  // 从 useRecentAnalysis 钩子中解构出 hasMore 和 loadMore
  const { recentSubmissions, isLoading: isLoadingHistory, hasMore, loadMore } = useRecentAnalysis();
  const { ref: loadMoreRef, inView: loadMoreInView } = useInView(); // Ref for the sentinel

  const [words, setWords] = useState<string[]>([]);
  const [showAllWords, setShowAllWords] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // const [displayLimit, setDisplayLimit] = useState(25);
  const [wordsToDisplay, setWordsToDisplay] = useState<string[]>([]);

  useEffect(() => {
    if (analysisResult?.words) {
      setWords(analysisResult.words);
    } else {
      setWords([]);
    }
    setShowAllWords(false);
  }, [analysisResult]);

  useEffect(() => {
    if (!analysisResource) return;
    if (analysisResource?.words && analysisResource.words.startsWith("[")) {
      onManualAnalysisResult(analysisResource);
    }
    // Set form fields based on the selected submission for easier re-analysis/viewing
    form.setValue('sourceType', analysisResource.sourceType);
    form.setValue('content', analysisResource.content);
    form.setValue('examType', analysisResource.examType);
    setSourceType(analysisResource.sourceType); // Also update local state for radio group display
  }, [analysisResource]);

  // Effect for infinite scroll
  useEffect(() => {
    if (loadMoreInView && hasMore && !isLoadingHistory) {
      loadMore();
    }
  }, [loadMoreInView, hasMore, isLoadingHistory, loadMore]);

  const form = useForm<AnalysisData>({
    resolver: zodResolver(analysisFormSchema),
    defaultValues: {
      sourceType: 'url',
      content: '',
      examType: 'TOEFL'
    }
  });

  const handleSourceTypeChange = (value: 'url' | 'article') => {
    setSourceType(value);
    form.setValue('sourceType', value);
    form.setValue('content', '');
    form.clearErrors('content');
  };

  const onSubmit = (data: AnalysisData) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (data.content.trim().length <= 2) {
      // form.setError('content', { message: "内容不能为空。" });
      return;
    }

    if (data.sourceType === 'url') {
      const trimmedContent = data.content.trim();
      const lettersOnlyRegex = /^[\p{L}]+$/u;

      if (lettersOnlyRegex.test(trimmedContent)) {
        // console.log(`Detected single word "${trimmedContent}" in URL field. Calling onWordSearch.`);
        onWordSearch(trimmedContent);
        return;
      }
    }

    onSubmitAnalysis(data);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim().length <= 2) {
      return;
    }
    onWordSearch(searchInput.trim());
  };

  // const handleAnalysisManualResult = (submission: Submission) => {
  //   if (submission.words && submission.words.startsWith("[")) {
  //     onManualAnalysisResult(submission);
  //   }
  //   // Set form fields based on the selected submission for easier re-analysis/viewing
  //   form.setValue('sourceType', submission.sourceType);
  //   form.setValue('content', submission.content);
  //   form.setValue('examType', submission.examType);
  //   setSourceType(submission.sourceType); // Also update local state for radio group display
  // };

  // const displayLimit = 25;
  // const wordsToDisplay = showAllWords ? words : words.slice(0, displayLimit);

  // Effect 2: Handles subtitle parsing (when subtitleContent or isMobile changes)
  useEffect(() => {
    const limit = isMobile ? 5 : 25;
    setWordsToDisplay(showAllWords ? words : words.slice(0, limit));
  }, [words, showAllWords, isMobile]);

  return (
    <div className="max-w-4xl mx-auto px-4 mb-8 mt-4">
      <Tabs defaultValue="search" className="mb-4">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="search">搜索</TabsTrigger>
          <TabsTrigger value="analyze">解析</TabsTrigger>
          {/* <TabsTrigger value="today">今日</TabsTrigger> */}
        </TabsList>
        
        <TabsContent value="search" className="mt-4 relative">
          {(isWordLoading || isAnalysisLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-md">
                  <LoadingFallback message={isWordLoading ? "正在加载单词..." : "分析处理中..."} />
              </div>
          )}          
          <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`当前: ${currentWord} | 搜索单词...`}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={searchInput.trim().length <= 2}>搜索</Button>
          </form>
        </TabsContent>

        <TabsContent value="analyze" className="mt-4 relative">
          {(isAnalysisLoading || isWordLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-md">
                  <LoadingFallback message={isAnalysisLoading ? "分析处理中..." : "正在加载单词..."} />
              </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-4xl mx-auto px-4 mb-8 mt-4">
              <div className="flex flex-wrap items-baseline gap-4">
                <FormField
                  control={form.control}
                  name="sourceType"
                  render={({ field }) => (
                      <FormItem className="space-y-0">
                          <FormControl>
                              <RadioGroup
                                  onValueChange={(value) => {
                                    // 同时更新表单状态和可能需要的自定义处理
                                    field.onChange(value);
                                    // 添加类型检查确保安全
                                    if (value === "url" || value === "article") {
                                      handleSourceTypeChange(value);
                                    } else {
                                      console.warn(`Unexpected value: ${value}`);
                                      // 或者使用默认值
                                      handleSourceTypeChange("url"); // 默认回退
                                    }
                                  }}
                                  value={field.value} // 关键修改：绑定当前值
                                  className="flex space-x-6"
                                  disabled={isAnalysisLoading}
                                >                         
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                      <RadioGroupItem value="url" id="url" />
                                    </FormControl>
                                    <FormLabel htmlFor="url" className="cursor-pointer">URL</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                      <RadioGroupItem value="article" id="article" />
                                    </FormControl>
                                    <FormLabel htmlFor="article" className="cursor-pointer">文章</FormLabel>
                                  </FormItem>
                                </RadioGroup>
                          </FormControl>
                      </FormItem>
                  )}
                />

                <Button className="ml-auto" type="submit" disabled={isAnalysisLoading || (form.watch('content') || '').trim().length <= 2}>
                  {isAnalysisLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    "解析"
                  )}
                </Button>

                <FormField
                  control={form.control}
                  name="examType"
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        disabled={isAnalysisLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择考试类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="GRE">GRE(EN)</SelectItem>
                          <SelectItem value="SAT">SAT(EN)</SelectItem>
                          <SelectItem value="TOEFL">TOEFL(EN)</SelectItem>
                          <SelectItem value="IELTS">IELTS(EN)</SelectItem>
                          <SelectItem value="PTE">PTE(EN)</SelectItem>
                          <SelectItem value="N1">N1(JP)</SelectItem>
                          <SelectItem value="N2">N2(JP)</SelectItem>
                          <SelectItem value="N3">N3(JP)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                  control={form.control}
                  name="examType"
                  render={() => (
                      <FormItem>
                          <FormMessage />
                      </FormItem>
                  )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    {sourceType === 'url' ? (
                      <FormControl>
                        <Input
                          placeholder="请输入URL链接（支持youtube）"
                          disabled={isAnalysisLoading}
                          {...field}
                        />
                      </FormControl>
                    ) : (
                      <FormControl>
                        <Textarea
                          placeholder="请输入文章内容"
                          className="min-h-[150px]"
                          disabled={isAnalysisLoading}
                          {...field}
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Recent Submissions - Flow Layout */}
              <div className="mt-4">
                {isLoadingHistory && recentSubmissions.length === 0 ? (
                  <div className="py-4 flex justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : recentSubmissions.length > 0 ? (
                  <div className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide">
                {recentSubmissions.map((submission) => (
                  <div 
                    key={submission.uuid} 
                    className="relative flex-shrink-0 w-40 h-24 bg-cover bg-center rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => refreshAnalysisResource(submission.uuid)}
                  >
                    {submission.thumbnail ? (
                      <img src={submission.thumbnail} alt={submission.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">无图</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-end p-2">
                      <h4 className="text-white text-sm font-medium truncate" title={submission.title}>
                        {submission.title}
                      </h4>
                    </div>
                  </div>
                ))}
                {/* Sentinel for infinite scroll */}
                {hasMore && (
                  <div ref={loadMoreRef} className="flex-shrink-0 w-px">
                    {isLoadingHistory && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                  </div>
                )}
              </div>
                ) : (
                  <div/>
                )}
                
              </div>
            </form>

            {/* Display the word list if analysisResult is available and contains a wordList */}
            {words && Array.isArray(words) && words.length > 0 && (
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-muted-foreground mb-0">提取的单词:</h3>
                    <Button
                          variant="ghost"
                          size="sm"
                          onClick={onClearAnalysisResult}
                          className="text-red-500 hover:text-red-700"
                          title="清除分析结果"
                      >
                          <XCircle className="h-4 w-4 mr-1" />
                          清除
                      </Button>
                      </div>
                    <div className="flex flex-wrap gap-2">
                        {wordsToDisplay.map((word, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => onWordClick(word, form.getValues('examType'))}
                                className={cn(
                                    "cursor-pointer",
                                    word === currentWord 
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                        : "hover:bg-primary/10 hover:text-primary"
                                )}
                            >
                                {word}
                            </Button>
                        ))}
                    </div>
                    {/* Conditional "Show All" or "Hide" button */}
                    {words.length > wordsToDisplay.length && !showAllWords && (
                        <div className="text-center mt-4">
                            <Button
                                variant="link"
                                onClick={() => setShowAllWords(true)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                显示全部
                            </Button>
                        </div>
                    )}
                    {words.length > wordsToDisplay.length && showAllWords && (
                        <div className="text-center mt-4">
                            <Button
                                variant="link"
                                onClick={() => setShowAllWords(false)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                收起
                            </Button>
                        </div>
                    )}
                </div>
            )}                
          </Form>
        </TabsContent>
      </Tabs>   

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {}}
      />            
    </div>      
  );
};

export default AnalysisForm;