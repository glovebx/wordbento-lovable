
import React, { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PronunciationButtonProps {
  word: string;
  className?: string;
}

const PronunciationButton: React.FC<PronunciationButtonProps> = ({ 
  word,
  className 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Initialize speech synthesis
    speechSynthRef.current = new SpeechSynthesisUtterance(word);
    speechSynthRef.current.lang = 'en-US';
    
    // Clean up on unmount
    return () => {
      if (isPlaying) {
        window.speechSynthesis.cancel();
      }
    };
  }, [word]);

  useEffect(() => {
    const handleEnd = () => {
      setIsPlaying(false);
    };

    const utterance = speechSynthRef.current;
    if (utterance) {
      utterance.onend = handleEnd;
    }

    return () => {
      if (utterance) {
        utterance.onend = null;
      }
    };
  }, []);

  const speakText = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    
    // First pronunciation
    window.speechSynthesis.speak(speechSynthRef.current!);
    
    // Second pronunciation with delay
    setTimeout(() => {
      if (speechSynthRef.current) {
        const secondUtterance = new SpeechSynthesisUtterance(word);
        secondUtterance.lang = 'en-US';
        secondUtterance.rate = 0.8; // Slower rate for second pronunciation
        window.speechSynthesis.speak(secondUtterance);
      }
    }, 1000);
  };

  return (
    <button
      onClick={speakText}
      className={cn(
        'rounded-full p-2 transition-all bg-green-500 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 duration-200 ease-in-out',
        isPlaying ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5',
        className
      )}
      title={isPlaying ? '停止朗读' : '朗读单词'}
    >
      <Volume2 
        className={cn(
          'h-6 w-6',
          isPlaying && 'animate-pulse-sound'
        )} 
      />
    </button>
  );
};

export default PronunciationButton;