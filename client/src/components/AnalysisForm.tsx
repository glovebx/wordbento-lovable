// components/AnalysisForm.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, XCircle, Search } from 'lucide-react';
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
  onWordClick: (word: string) => void;
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
  onWordClick, 
  onClearAnalysisResult, 
  onManualAnalysisResult, 
  onWordSearch, 
  currentWord }) => {

    const { isAuthenticated } = useAuth();  

  const [sourceType, setSourceType] = useState<'url' | 'article'>('url');
  const [searchInput, setSearchInput] = useState('');
  // 从 useRecentAnalysis 钩子中解构出 hasMore 和 loadMore
  const { recentSubmissions, isLoading: isLoadingHistory, hasMore, loadMore } = useRecentAnalysis(isAuthenticated);
  const [words, setWords] = useState<string[]>([]);
  const [showAllWords, setShowAllWords] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (analysisResult?.words) {
      setWords(analysisResult.words);
    } else {
      setWords([]);
    }
    setShowAllWords(false);
  }, [analysisResult]);

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

    if (data.sourceType === 'url') {
      const trimmedContent = data.content.trim();
      const lettersOnlyRegex = /^[\p{L}]+$/u;

      if (lettersOnlyRegex.test(trimmedContent)) {
        console.log(`Detected single word "${trimmedContent}" in URL field. Calling onWordSearch.`);
        onWordSearch(trimmedContent);
        return;
      }
    }

    onSubmitAnalysis(data);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onWordSearch(searchInput.trim());
    }
  };

  const handleAnalysisManualResult = (submission: Submission) => {
    if (submission.words && submission.words.startsWith("[")) {
      onManualAnalysisResult(submission);
    }
    // Set form fields based on the selected submission for easier re-analysis/viewing
    form.setValue('sourceType', submission.sourceType);
    form.setValue('content', submission.content);
    form.setValue('examType', submission.examType);
    setSourceType(submission.sourceType); // Also update local state for radio group display
  };

  const displayLimit = 25;
  const wordsToDisplay = showAllWords ? words : words.slice(0, displayLimit);

  return (
    <div className="max-w-4xl mx-auto px-4 mb-8 mt-4">
      <Tabs defaultValue="search" className="mb-4">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="search">搜索</TabsTrigger>
          <TabsTrigger value="analyze">解析</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="mt-4 relative">
          {(isWordLoading || isAnalysisLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-md">
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
            <Button type="submit">搜索</Button>
          </form>
        </TabsContent>

        <TabsContent value="analyze" className="mt-4 relative">
          {(isAnalysisLoading || isWordLoading) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-md">
                  <LoadingFallback message={isAnalysisLoading ? "分析处理中..." : "正在加载单词..."} />
              </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-4xl mx-auto px-4 mb-8 mt-4">
              <div className="flex flex-wrap items-center gap-4">
                <FormField
                  control={form.control}
                  name="sourceType"
                  render={({ field }) => (
                      <FormItem className="space-y-0">
                          <FormControl>
                              <RadioGroup
                                  onValueChange={handleSourceTypeChange}
                                  defaultValue={field.value}
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

                <Button className="ml-auto" type="submit" disabled={isAnalysisLoading || isWordLoading}>
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
                        disabled={isAnalysisLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择考试类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TOEFL">TOEFL</SelectItem>
                          <SelectItem value="GRE">GRE</SelectItem>
                          <SelectItem value="TOEIC">TOEIC</SelectItem>
                          <SelectItem value="SAT">SAT</SelectItem>
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
                  <div className="flex flex-wrap gap-2">
                    {recentSubmissions.map((submission, _) => (
                      <div 
                        key={submission.uuid} // Use uuid as key for stability
                        className="py-1.5 px-2.5 text-xs bg-muted/50 rounded-md flex items-center cursor-pointer hover:bg-muted/80 transition-colors max-w-full"
                        onClick={() => handleAnalysisManualResult(submission)}
                      >
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs mr-1.5 whitespace-nowrap">
                          {submission.sourceType === 'url' ? 'URL' : '文章'}
                        </span>
                        <span className="truncate hover:text-primary transition-colors">
                          {submission.content}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div/>
                )}
                
                {/* "更多" 按钮 */}
                {hasMore && ( // 只有当 hasMore 为 true 才显示
                  <div className="mt-4 text-center">
                    <Button 
                      variant="outline" 
                      onClick={loadMore} 
                      disabled={isLoadingHistory} // 如果正在加载历史记录，则禁用
                      className="px-6 py-2 rounded-md shadow-sm"
                    >
                      {isLoadingHistory ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          加载中...
                        </>
                      ) : (
                        "更多"
                      )}
                    </Button>
                  </div>
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
                                onClick={() => onWordClick(word)}
                                className={cn(
                                    "cursor-pointer",
                                    word === currentWord ? "bg-blue-500 text-white hover:bg-blue-600" : "hover:bg-gray-100"
                                )}
                            >
                                {word}
                            </Button>
                        ))}
                    </div>
                    {/* Conditional "Show All" or "Hide" button */}
                    {words.length > displayLimit && !showAllWords && (
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
                    {words.length > displayLimit && showAllWords && (
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