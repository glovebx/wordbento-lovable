
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Atom, 
  Layers, 
  History, 
  ArrowUpDown, 
  Lightbulb, 
  Newspaper,
} from 'lucide-react';

import GridCard from './GridCard';
import WordImageDisplay from './WordImageDisplay';
import PronunciationButton from './PronunciationButton';
import { WordDataType } from '@/types/wordTypes';
// import { useToast } from '@/components/ui/use-toast'; // Assuming you use shadcn/ui toast
// import { axiosPrivate } from "@/lib/axios"; // Import your axiosPrivate instance
// Import the new MasterButton component
import MasterButton from './MasterButton'; // Adjust the import path
// import { cn } from '@/lib/utils';

interface WordGridProps {
  word: WordDataType;
  onMasteredSuccess: () => void;
}

// Creates an animated word where each letter animates in sequence
const AnimatedWord: React.FC<{ word: string }> = ({ word }) => {
  return (
    <div className="relative inline-flex">
      {word.split('').map((char, index) => (
        <span 
          key={index} 
          className="wave-text" 
          style={{ 
            // @ts-ignore
            '--i': index
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
};

const WordGrid: React.FC<WordGridProps> = ({ 
  word, 
  onMasteredSuccess
 }) => {
  // const imageUrl = `/placeholder.svg`;
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Simulate image loading after the component renders
  useEffect(() => {
    // Reset image state when word changes
    setImageUrl('');
    
    // Simulate API request to get image for the word
    const fetchImage = async () => {
      setIsLoading(true);
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // In a real implementation, you would fetch the actual image URL from your API
        // For now, we'll use a placeholder image
        setImageUrl('/placeholder.svg');
      } catch (error) {
        console.error('Error fetching image:', error);
        setImageUrl('');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchImage();
  }, [word]);

  // Safely access definition content
  const definitionContent = word.content.definition;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-5xl font-bold tracking-tight">
            <AnimatedWord word={word.word_text} />
          </h1>
          <PronunciationButton word={word.word_text} className="mt-1" />
          <MasterButton
            wordId={word.id}
            onMasteredSuccess={onMasteredSuccess}
            className="mt-1" // Example: Pass a class name to style the button
          />
        </div>
        <p className="text-xl text-gray-600">
          {word.phonetic} · {word.meaning}
        </p>

        <div className="text-left max-w-2xl mx-auto px-4"> {/* Container for definition text */}
                {/* Optional: Include the icon next to the definition title/text */}
                {/* <div className="flex items-center justify-center mb-2">
                    {definitionContent.icon && (
                        <BookOpen className="h-5 w-5 text-blue-500 mr-2" /> // Using BookOpen icon
                    )}
                    <h3 className="text-lg font-semibold text-gray-800">Definition</h3> // Optional title
                </div> */}

                {/* Render English Definition */}
                {typeof definitionContent.en === 'string' && definitionContent.en.trim() !== '' && (
                    <p className="text-sm text-foreground mb-2"> {/* Added mb-2 for spacing between languages */}
                        {definitionContent.en.split('\n').map((line, index, array) => (
                            <React.Fragment key={index}>
                                {line}
                                {index < array.length - 1 && <br />} {/* Add <br /> for newlines */}
                            </React.Fragment>
                        ))}
                    </p>
                )}
                 {/* Handle array case for English definition if necessary (based on WordContentMap) */}
                 {Array.isArray(definitionContent.en) && definitionContent.en.length > 0 && (
                     <div className="text-sm text-foreground mb-2">
                        {definitionContent.en.map((item, index) => (
                            <React.Fragment key={index}>
                                {item}
                                {index < definitionContent.en.length - 1 && <br />}
                            </React.Fragment>
                        ))}
                     </div>
                 )}


                {/* Render Chinese Definition */}
                {typeof definitionContent.zh === 'string' && definitionContent.zh.trim() !== '' && (
                    <p className="text-sm text-muted-foreground">
                         {definitionContent.zh.split('\n').map((line, index, array) => (
                            <React.Fragment key={index}>
                                {line}
                                {index < array.length - 1 && <br />} {/* Add <br /> for newlines */}
                            </React.Fragment>
                        ))}
                    </p>
                )}
                {/* Handle array case for Chinese definition if necessary (based on WordContentMap) */}
                 {Array.isArray(definitionContent.zh) && definitionContent.zh.length > 0 && (
                     <div className="text-sm text-muted-foreground">
                        {definitionContent.zh.map((item, index) => (
                            <React.Fragment key={index}>
                                {item}
                                {index < definitionContent.zh.length - 1 && <br />}
                            </React.Fragment>
                        ))}
                     </div>
                 )}

                 {/* Optional: Fallback if no definition content is available */}
                 {/* {!definitionContent.en && !definitionContent.zh && !Array.isArray(definitionContent.en) && !Array.isArray(definitionContent.zh) && (
                     <p className="text-sm text-gray-500">No definition available.</p>
                 )} */}

            </div>        
        
      </div>      

        {/* Word Image - Centered in the page */}
      <WordImageDisplay initialImageUrls={[]} wordText={word.word_text} />

      <div className="bento-grid">
        {/* Definition Card */}
        {/* <GridCard
          id="definition"
          title={{
            en: "Definition",
            zh: "词义解释"
          }}
          content={{
            en: word.content.definition.en,
            zh: word.content.definition.zh
          }}
          icon={<BookOpen className="h-5 w-5 text-blue-500" />}
          className="bg-bento-definition"
        /> */}

        {/* Etymology Card */}
        <GridCard
          id="etymology"
          title={{
            en: "Etymology",
            zh: "词源分析"
          }}
          content={{
            en: word.content.etymology.en,
            zh: word.content.etymology.zh
          }}
          icon={<Atom className="h-5 w-5 text-indigo-500" />}
          className="bg-bento-etymology"
        />

        {/* Affixes Card */}
        <GridCard
          id="affixes"
          title={{
            en: "Affixes Analysis",
            zh: "词缀分析"
          }}
          content={{
            en: word.content.affixes.en,
            zh: word.content.affixes.zh
          }}
          icon={<Layers className="h-5 w-5 text-purple-500" />}
          className="bg-bento-affixes"
        />

        {/* History Card */}
        <GridCard
          id="history"
          title={{
            en: "Historical Background",
            zh: "发展历史和文化背景"
          }}
          content={{
            en: word.content.history.en,
            zh: word.content.history.zh
          }}
          icon={<History className="h-5 w-5 text-orange-500" />}
          className="bg-bento-history"
        />

        {/* Word Forms Card */}
        <GridCard
          id="forms"
          title={{
            en: "Word Forms",
            zh: "单词变形"
          }}
          content={{
            en: word.content.forms.en,
            zh: word.content.forms.zh
          }}
          icon={<ArrowUpDown className="h-5 w-5 text-green-500" />}
          className="bg-bento-forms"
        />

        {/* Memory Aid Card */}
        <GridCard
          id="memoryAid"
          title={{
            en: "Memory Aid",
            zh: "记忆辅助"
          }}
          content={{
            en: word.content.memory_aid.en,
            zh: word.content.memory_aid.zh
          }}
          icon={<Lightbulb className="h-5 w-5 text-pink-500" />}
          className="bg-bento-memory"
        />

        {/* Examples Card */}
        <GridCard
          id="examples"
          title={{
            en: "Examples",
            zh: "例句"
          }}
          content={{
            en: (
              <ul className="list-disc pl-5 space-y-1">
                {/* Check if examples content exists and if the English examples are an array */}
                {word.content.examples && Array.isArray(word.content.examples.en) ? (
                  word.content.examples.en.map((example, i) => (
                    <li key={i}>{example}</li>
                  ))
                ) : (
                  // Optional: Render a fallback message if examples are not available or not in expected format
                  <li>No English examples available.</li>
                )}
              </ul>
            ),
            zh: (
              <ul className="list-disc pl-5 space-y-1">
                {/* Check if examples content exists and if the English examples are an array */}
                {word.content.examples && Array.isArray(word.content.examples.zh) ? (
                  word.content.examples.zh.map((example, i) => (
                    <li key={i}>{example}</li>
                  ))
                ) : (
                  // Optional: Render a fallback message if examples are not available or not in expected format
                  <li>No Chinese examples available.</li>
                )}
              </ul>
            )
          }}
          icon={<FileText className="h-5 w-5 text-amber-500" />}
          className="bg-bento-examples"
        />

        {/* Trending Story Card */}
        <GridCard
          id="trendingStory"
          title={{
            en: "Trending Story",
            zh: "热点故事"
          }}
          content={{
            en: word.content.trending_story.en,
            zh: word.content.trending_story.zh
          }}
          icon={<Newspaper className="h-5 w-5 text-yellow-600" />}
          className="bg-bento-story"
          size="lg"
        />
      </div>
    </div>
  );
};

export default WordGrid;