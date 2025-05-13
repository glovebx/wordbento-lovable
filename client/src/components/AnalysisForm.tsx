import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; // Import FormMessage for validation errors
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod'; // Import zodResolver
import { z } from 'zod'; // Import zod for schema definition
import { Loader2, XCircle, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import the AnalysisData interface
import { AnalysisData, AnalysisResult } from '@/types/analysisTypes';


// Define Zod schema for validation
const analysisFormSchema = z.object({
  sourceType: z.enum(['url', 'article'], {
    required_error: "请选择资源类型。",
  }),
  content: z.string().min(1, {
    message: "内容不能为空。",
  }),
  // examType: z.enum(['托福', 'GRE', 'TOEIC', 'SAT', '6级'], { // Ensure '6级' is included here
  //    required_error: "请选择考试类型。",
  // }),
  examType: z.string().min(1, {
    message: "请选择考试类型。",
  })  
});

interface AnalysisFormProps {
  // onAnalyze prop now takes the form data and returns void (async handled by hook)
  onSubmitAnalysis: (data: AnalysisData) => void;
  // Receive loading state from the parent/hook
  isLoading: boolean;
  // Receive the analysis result to display extracted words
  analysisResult: AnalysisResult | null;
  // Receive the handleSearch function to make words clickable
  onWordClick: (word: string) => void;
  // New prop: Function to clear the analysis result
  onClearAnalysisResult: () => void;  
  onWordSearch: (word: string) => void;
  currentWord: string;  
}

const AnalysisForm: React.FC<AnalysisFormProps> = ({ onSubmitAnalysis, isLoading, analysisResult, onWordClick, onClearAnalysisResult, onWordSearch, currentWord }) => {
  // sourceType state is still useful for conditionally rendering Input/Textarea
  const [sourceType, setSourceType] = useState<'url' | 'article'>('url');
  const [searchInput, setSearchInput] = useState('');

  // Initialize react-hook-form with Zod resolver
  const form = useForm<AnalysisData>({
    resolver: zodResolver(analysisFormSchema),
    defaultValues: {
      sourceType: 'url',
      content: '',
      examType: 'TOEFL' // Set a default exam type
    }
  });

  // Watch the sourceType field to update local state and clear content
  // Use form.watch instead of local state for sourceType if you prefer form state as source of truth
  // const watchedSourceType = form.watch('sourceType');

  const handleSourceTypeChange = (value: 'url' | 'article') => {
    setSourceType(value); // Update local state for conditional rendering
    form.setValue('sourceType', value); // Update form state
    form.setValue('content', ''); // Clear content when switching type
    form.clearErrors('content'); // Clear content errors
  };

  // The onSubmit handler now just calls the parent's onSubmitAnalysis prop
  const onSubmit = (data: AnalysisData) => {
    onSubmitAnalysis(data); // Call the function provided by the parent component
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onWordSearch(searchInput.trim());
    }
  };

  // Extract word list from analysisResult if available
  const words = analysisResult?.words;

  return (
    <div className="max-w-4xl mx-auto px-4 mb-8 mt-4">
      <Tabs defaultValue="search" className="mb-4">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="search">搜索</TabsTrigger>
          <TabsTrigger value="analyze">解析</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="mt-4">
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

        <TabsContent value="analyze" className="mt-4">
          <Form {...form}>
            {/* Use form.handleSubmit to wrap your onSubmit function */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-4xl mx-auto px-4 mb-8 mt-4">
              {/* First row: Source Type Selection + Exam Type Dropdown + Submit Button */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Source Type Radio Group */}
                <FormField
                  control={form.control}
                  name="sourceType"
                  render={({ field }) => (
                      <FormItem className="space-y-0"> {/* Reduce space */}
                          <FormControl>
                              <RadioGroup
                                  onValueChange={handleSourceTypeChange} // Use custom handler
                                  defaultValue={field.value}
                                  className="flex space-x-6"
                                  disabled={isLoading} // Disable while loading
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
                          {/* FormMessage can be added here if you want validation feedback for the radio group */}
                          {/* <FormMessage /> */}
                      </FormItem>
                  )}
                />

                {/* Submit Button - Moved here */}
                {/* Use isLoading prop from parent to disable */}
                <Button className="ml-auto" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      处理中... {/* Button text indicating processing */}
                    </>
                  ) : (
                    "解析" // Button text when idle
                  )}
                </Button>

                {/* Exam Type Select Dropdown */}
                <FormField
                  control={form.control}
                  name="examType"
                  render={({ field }) => (
                    <FormItem className="w-24"> {/* Fixed width */}
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoading} // Disable while loading
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
              {/* Add FormMessage for examType validation */}
              <FormField
                  control={form.control}
                  name="examType"
                  render={({ field }) => (
                      <FormItem>
                          {/* This FormMessage will display validation errors for examType */}
                          <FormMessage />
                      </FormItem>
                  )}
              />


              {/* Content Input (URL or Textarea) */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    {sourceType === 'url' ? (
                      <FormControl>
                        <Input
                          placeholder="请输入URL链接"
                          disabled={isLoading} // Disable while loading
                          {...field}
                        />
                      </FormControl>
                    ) : (
                      <FormControl>
                        <Textarea
                          placeholder="请输入文章内容"
                          className="min-h-[150px]"
                          disabled={isLoading} // Disable while loading
                          {...field}
                        />
                      </FormControl>
                    )}
                    {/* Add FormMessage for content validation */}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>

            {/* Display the word list if analysisResult is available and contains a wordList */}
            {analysisResult && words && Array.isArray(words) && words.length > 0 && (
                <div className="container mx-auto px-4 py-4"> {/* Added padding */}
                    <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-muted-foreground mb-0">提取的单词:</h3>
                    <Button
                          variant="ghost" // Use ghost variant for a less prominent button
                          size="sm" // Small size
                          onClick={onClearAnalysisResult} // Call the clear function prop
                          className="text-red-500 hover:text-red-700" // Style the button with red color
                          title="清除分析结果" // Add a tooltip
                      >
                          <XCircle className="h-4 w-4 mr-1" /> {/* Add an icon */}
                          清除
                      </Button>   
                      </div>               
                    {/* Fluid layout for word tags */}
                    <div className="flex flex-wrap gap-2">
                        {words.map((word, index) => (
                            <Button
                                key={index} // Use index as key if words are not guaranteed unique/stable
                                variant="outline" // Use outline variant for a tag look
                                size="sm" // Small size
                                onClick={() => onWordClick(word)} // Call the onWordClick prop
                                className="cursor-pointer" // Indicate it's clickable
                            >
                                {word}
                            </Button>
                        ))}
                    </div>
                    {/* Optional: Display other analysis results (summary, etc.) */}
                    {/* <pre className="bg-gray-100 p-4 rounded-md overflow-auto mt-4">
                        {JSON.stringify(analysisResult, null, 2)}
                    </pre> */}
                </div>
            )}      
          </Form>
        </TabsContent>
      </Tabs>
    </div>  
  );
};

export default AnalysisForm;
