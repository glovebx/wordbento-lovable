// components/AudioPlayer.tsx
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Subtitles, X, Settings } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { parseSrt, SubtitleCue } from '../utils/subtitleParser';
import { throttle } from 'lodash-es';
import { useIsMobile } from '@/hooks/use-mobile';
import LocalStorageManager from '../utils/storage';

// Define your specific keys for AudioPlayer here, no longer in storage.ts
const AUDIO_PLAYER_KEYS = {
  PLAYBACK_RATE: 'playbackRate',
  SUBTITLE_OFFSET: 'subtitleOffset',
  SUBTITLE_FONT_SIZE: 'subtitleFontSize', // New key for font size
  LAST_PLAYBACK_POSITION: 'lastPlaybackPosition' // New key
} as const;

interface AudioPlayerProps {
  audioUrl: string;
  subtitleContent?: string;
  highlightWords?: string[];
  onClose: () => void;
  // New prop: Callback when a highlighted word is clicked (used for FloatingImageCarousel)
  onHighlightedWordClick?: (word: string, rect: DOMRect) => void;
  // NEW prop: Callback when the search button above a highlighted word is clicked
  onSearchWord?: (word: string) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, subtitleContent, highlightWords = [], onClose, onHighlightedWordClick, onSearchWord }) => {
  const isMobile = useIsMobile();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [parsedCues, setParsedCues] = useState<SubtitleCue[]>([]);
  const [currentActiveCueIndex, setCurrentActiveCueIndex] = useState<number | null>(null);
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  const [tempSliderValue, setTempSliderValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const lastCueIndex = useRef(-1); // Cache for last active cue index

  // State for the search button that appears above a non-highlighted word
  const [wordForSearch, setWordForSearch] = useState<string | null>(null);
  const [searchButtonPosition, setSearchButtonPosition] = useState<{ x: number; y: number; width: number; } | null>(null);


  // Create a memoized instance of LocalStorageManager,
  // using audioUrl as the unique scope for this player's settings.
  const localStorageManager = useMemo(() => {
    return new LocalStorageManager(`ap_${audioUrl}`);
  }, [audioUrl]);

  // Common storage for settings that persist across different audio files
  const commonStorageManager = useMemo(() => {
    return new LocalStorageManager('ap_common'); // Use a generic key for common settings
  }, []);

  // Use a function for useState initial value to read from localStorage immediately
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    const storedRate = localStorageManager.getItem<number>(AUDIO_PLAYER_KEYS.PLAYBACK_RATE);
    return storedRate !== null ? storedRate : 1.0;
  });

  const [subtitleOffset, setSubtitleOffset] = useState<number>(() => {
    const storedOffset = localStorageManager.getItem<number>(AUDIO_PLAYER_KEYS.SUBTITLE_OFFSET);
    return storedOffset !== null ? storedOffset : 0;
  });

  // State for subtitle font size (common setting)
  const [subtitleFontSize, setSubtitleFontSize] = useState<number>(() => {
    const storedFontSize = commonStorageManager.getItem<number>(AUDIO_PLAYER_KEYS.SUBTITLE_FONT_SIZE);
    return storedFontSize !== null ? storedFontSize : 24; // Default font size
  });

  // Load settings from local storage on component mount or audioUrl change (for audio-specific settings)
  useEffect(() => {
    const storedPlaybackRate = localStorageManager.getItem<number>(AUDIO_PLAYER_KEYS.PLAYBACK_RATE);
    setPlaybackRate(storedPlaybackRate !== null ? storedPlaybackRate : 1.0);

    const storedSubtitleOffset = localStorageManager.getItem<number>(AUDIO_PLAYER_KEYS.SUBTITLE_OFFSET);
    setSubtitleOffset(storedSubtitleOffset !== null ? storedSubtitleOffset : 0);
  }, [audioUrl, localStorageManager]);

  // Load common settings from local storage on component mount (for app-wide settings)
  useEffect(() => {
    const storedFontSize = commonStorageManager.getItem<number>(AUDIO_PLAYER_KEYS.SUBTITLE_FONT_SIZE);
    setSubtitleFontSize(storedFontSize !== null ? storedFontSize : 24);
  }, [commonStorageManager]);

  // Save audio-specific settings to local storage whenever they change
  useEffect(() => {
    localStorageManager.setItem(AUDIO_PLAYER_KEYS.PLAYBACK_RATE, playbackRate);
  }, [playbackRate, localStorageManager]);

  useEffect(() => {
    localStorageManager.setItem(AUDIO_PLAYER_KEYS.SUBTITLE_OFFSET, subtitleOffset);
  }, [subtitleOffset, localStorageManager]);

  // Save common settings to local storage whenever they change
  useEffect(() => {
    commonStorageManager.setItem(AUDIO_PLAYER_KEYS.SUBTITLE_FONT_SIZE, subtitleFontSize);
  }, [subtitleFontSize, commonStorageManager]);

  // Effect 1: Handles audio loading and reset (only when audioUrl changes)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setIsPlaying(false);

      // audio.currentTime = 0;
      // setCurrentTime(0);
    // Get saved position from localStorage
      const savedPosition = localStorageManager.getItem<number>(AUDIO_PLAYER_KEYS.LAST_PLAYBACK_POSITION);
      const initialTime = savedPosition !== null ? savedPosition : 0;
      
      audio.currentTime = initialTime;
      setCurrentTime(initialTime);
      
      setCurrentActiveCueIndex(null);
      setDuration(0); 
      setIsLoading(true); 
      // Clear search button state when audio changes
      setWordForSearch(null);
      setSearchButtonPosition(null);
    }
  }, [audioUrl, localStorageManager]); 

  // Effect 2: Handles subtitle parsing (when subtitleContent or isMobile changes)
  useEffect(() => {
    if (subtitleContent) {
      try {
        const parsed = parseSrt(isMobile, subtitleContent); 
        setParsedCues(parsed.sort((a, b) => a.startTime - b.startTime));
      } catch (error) {
        console.error('SRT解析失败:', error);
        setParsedCues([]);
      }
    } else {
      setParsedCues([]);
    }
  }, [subtitleContent, isMobile]);

  // Optimized binary search with adjacent checks
  const findActiveCueOptimized = useCallback(
    (normalizedTime: number): number | null => {
      // Prioritize checking around the last known index
      if (lastCueIndex.current !== -1) {
        // Check current index
        const currentCue = parsedCues[lastCueIndex.current];
        if (currentCue && normalizedTime >= currentCue.startTime && normalizedTime < currentCue.endTime) {
          return lastCueIndex.current;
        }

        // Check next few cues (forward movement is common)
        for (let i = 1; i <= 2; i++) {
          const nextIndex = lastCueIndex.current + i;
          if (nextIndex < parsedCues.length) {
            const nextCue = parsedCues[nextIndex];
            if (nextCue && normalizedTime >= nextCue.startTime && normalizedTime < nextCue.endTime) {
              lastCueIndex.current = nextIndex;
              return lastCueIndex.current;
            }
          }
        }

        // Check previous few cues (backward movement or minor jumps)
        for (let i = 1; i <= 2; i++) {
          const prevIndex = lastCueIndex.current - i;
          if (prevIndex >= 0) {
            const prevCue = parsedCues[prevIndex];
            if (prevCue && normalizedTime >= prevCue.startTime && normalizedTime < prevCue.endTime) {
              lastCueIndex.current = prevIndex;
              return lastCueIndex.current;
            }
          }
        }
      }

      // If not found near cached index, perform full binary search
      let low = 0;
      let high = parsedCues.length - 1;
      let resultIndex: number | null = null;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const cue = parsedCues[mid];
        
        if (cue && normalizedTime >= cue.startTime && normalizedTime < cue.endTime) {
          resultIndex = mid;
          break;
        } else if (cue && normalizedTime < cue.startTime) {
          high = mid - 1;
        } else { // normalizedTime >= cue.endTime
          low = mid + 1;
        }
      }
      lastCueIndex.current = resultIndex ?? -1;
      return resultIndex;
    },
    [parsedCues]
  );

  // Effect to save playback position periodically
  useEffect(() => {
    const savePosition = throttle(() => {
      if (audioRef.current && !isSliderDragging) {
        localStorageManager.setItem(AUDIO_PLAYER_KEYS.LAST_PLAYBACK_POSITION, audioRef.current.currentTime);
      }
    }, 1000); // Save every second

    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('timeupdate', savePosition);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('timeupdate', savePosition);
      }
      savePosition.cancel();
    };
  }, [isSliderDragging, localStorageManager]);

  const handleTimeUpdate = useCallback(
    throttle(() => {
      const audio = audioRef.current;
      if (!audio || isSliderDragging) return;

      const currentAudioTime = audio.currentTime;
      setCurrentTime(currentAudioTime);
      
      const contentTime = currentAudioTime + subtitleOffset;

      const activeCueIndex = findActiveCueOptimized(contentTime);

      // Clear search button state if the active cue changes
      if (activeCueIndex !== currentActiveCueIndex) {
        setWordForSearch(null);
        setSearchButtonPosition(null);
      }
      setCurrentActiveCueIndex(activeCueIndex);

    }, 33),
    [isSliderDragging, findActiveCueOptimized, subtitleOffset, currentActiveCueIndex]
  );

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !isLoading) {
      audio[isPlaying ? 'pause' : 'play']();
    }
  }, [isPlaying, isLoading]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedData = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      audio.playbackRate = playbackRate;
    };

    const handleAudioPlayPauseEvent = () => setIsPlaying(!audio.paused);

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentActiveCueIndex(null);
      setCurrentTime(0);
      audio.playbackRate = 1.0;
      // Clear the saved position when audio ends
      localStorageManager.removeItem(AUDIO_PLAYER_KEYS.LAST_PLAYBACK_POSITION);      
    };

    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handleAudioPlayPauseEvent);
    audio.addEventListener('pause', handleAudioPlayPauseEvent);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('play', handleAudioPlayPauseEvent);
      audio.removeEventListener('pause', handleAudioPlayPauseEvent);
      audio.removeEventListener('ended', handleEnded); 
      handleTimeUpdate.cancel();
    };
  }, [handleTimeUpdate, playbackRate]);

  // Effect to handle spacebar keydown for play/pause toggle
  useEffect(() => {
    const handleSpacebarToggle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName;

      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || isLoading) {
        return; 
      }

      if (event.key === ' ') {
        event.preventDefault();
        handlePlayPause();
      }
    };

    window.addEventListener('keydown', handleSpacebarToggle);

    return () => {
      window.removeEventListener('keydown', handleSpacebarToggle);
    };
  }, [handlePlayPause, isLoading]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // This useEffect ensures the audio's playbackRate is updated when the state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;

      const event = new Event('timeupdate');
      audioRef.current.dispatchEvent(event);      
    }
  }, [playbackRate]);

  const onSliderValueChange = useCallback((value: number[]) => {
    setIsSliderDragging(true);
    setTempSliderValue(value[0]);
  }, []);

  const onSliderValueCommit = useCallback((value: number[]) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value[0];
      setCurrentTime(value[0]);
      
      const contentTime = value[0] + subtitleOffset;
      setCurrentActiveCueIndex(findActiveCueOptimized(contentTime));

      // Save the new position
      localStorageManager.setItem(AUDIO_PLAYER_KEYS.LAST_PLAYBACK_POSITION, value[0]);      
    }
    setIsSliderDragging(false);
  }, [findActiveCueOptimized, subtitleOffset, localStorageManager]);

  const formatTime = useCallback((time: number) => {
    if (isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // // OPTIMIZATION: Memoize escapedHighlightWords
  // const escapedHighlightWords = useMemo(() => {
  //   // Ensure highlightWords is an array before mapping
  //   if (!highlightWords || highlightWords.length === 0) {
  //     return [];
  //   }
  //   return highlightWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // }, [highlightWords]); // Only re-calculate if highlightWords array changes

  // OPTIMIZATION: Memoize escapedHighlightWords
  const escapedSplitRegex = useMemo(() => {
    // Ensure highlightWords is an array before mapping
    if (!highlightWords || highlightWords.length === 0) {
      // // 如果没有高亮词，返回一个不匹配任何内容的正则表达式
      return /(?!)/;
    }
    const escapedHighlightWords = highlightWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // // return new RegExp(`(${escapedHighlightWords.join('|')}|\\s+)`, 'gi');
    // return new RegExp(`(\\b(?:${escapedHighlightWords.join('|')}\\b)|(\\s+)`, 'gi');
    // 关键改动：为每个单词前后添加 \b 来确保整词匹配
    const wordsRegexPart = escapedHighlightWords.map(w => `\\b${w}\\b`).join('|');

    // 将高亮词和空格组合成一个带捕获组的正则表达式
    // 捕获组 `()` 能确保分隔符（高亮词和空格）本身也被包含在 split 的结果数组中
    return new RegExp(`(${wordsRegexPart}|\\s+)`, 'gi');    
  }, [highlightWords]); // Only re-calculate if highlightWords array changes

  const highlightText = useCallback((text: string) => {
    // const escapedHighlightWords = highlightWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // Use a regex that splits by spaces OR by highlight words, keeping highlight words as parts
    // const splitRegex = new RegExp(`(${escapedHighlightWords.join('|')}|\\s+)`, 'gi');

    const parts = text.split(escapedSplitRegex).filter(Boolean); // Filter out empty strings

    return (
      <>
        {parts.map((part, index) => {
          // If the part is just whitespace, render it as such
          if (part.trim() === '' && /\s/.test(part)) {
            return <span key={index}>{part}</span>;
          }

          const isHighlight = highlightWords.some(word => word.toLowerCase() === part.toLowerCase());
          
          if (isHighlight) {
            return (
              <span
                key={index}
                className="bg-yellow-300 text-black rounded cursor-pointer hover:bg-yellow-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling
                  // Only call onHighlightedWordClick for highlighted words
                  if (onHighlightedWordClick) {
                    onHighlightedWordClick(part, e.currentTarget.getBoundingClientRect());
                  }
                  // Do NOT show search button for highlighted words
                  setWordForSearch(null);
                  setSearchButtonPosition(null);
                }}
              >
                {part}
              </span>
            );
          } else {
            // This is a non-highlighted word
            return (
              <span
                key={index}
                className="cursor-pointer hover:bg-gray-700/50 rounded"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling
                  // Set state for the search button for THIS clicked non-highlighted word
                  // Clean the word for logic, but display the original part
                  const cleanedWord = part.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
                  setWordForSearch(cleanedWord);
                  setSearchButtonPosition(e.currentTarget.getBoundingClientRect());
                  // Do NOT call onHighlightedWordClick for non-highlighted words
                }}
              >
                {part}
              </span>
            );
          }
        })}
      </>
    );
  }, [highlightWords, escapedSplitRegex, onHighlightedWordClick]);

  const getSubtitlesToDisplay = useMemo(() => {
    if (currentActiveCueIndex === null || !showSubtitles || parsedCues.length == 0) {
      return [];
    }
    return [parsedCues[currentActiveCueIndex]];
  }, [currentActiveCueIndex, parsedCues, showSubtitles]);


  if (!audioUrl) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-4 shadow-lg z-50">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
        <audio ref={audioRef} src={audioUrl} preload="auto" />

        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="animate-pulse text-lg">加载音频中...</span>
          </div>
        )}

        <div className="flex items-center gap-2 w-full md:w-auto mb-2 md:mb-0">
          <Button variant="ghost" size="icon" onClick={handlePlayPause} disabled={isLoading}>
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVolume(volume === 0 ? 1 : 0)}
            >
              {volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={(val) => setVolume(val[0])}
              className="w-20"
              disabled={isLoading}
            />
          </div>

          {parsedCues.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSubtitles(!showSubtitles)}
              >
                <Subtitles
                  className={cn("h-6 w-6", showSubtitles ? "text-blue-300" : "")}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className={cn("", showSettingsPanel ? "text-blue-300" : "")}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </>         
          )}
        </div>

        <div className="flex items-center gap-2 flex-grow w-full md:w-auto">
          <span className="text-sm w-12 text-right">
            {formatTime(isSliderDragging ? tempSliderValue : currentTime)}
          </span>
          <Slider
            value={[isSliderDragging ? tempSliderValue : currentTime]}
            max={duration || 1}
            step={0.1}
            onValueChange={onSliderValueChange}
            onValueCommit={onSliderValueCommit}
            className="flex-1"
            disabled={!duration || isLoading}
          />
          <span className="text-sm w-12 text-left">{formatTime(duration)}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="mt-2 md:mt-0 md:ml-4"
        >
          <X className="h-5 w-5" />
        </Button>        
      </div>

      {showSettingsPanel && (
        <div className="absolute bottom-[calc(100%+0px)] left-0 right-0 bg-gray-800 text-white p-3 rounded-t-lg shadow-lg z-40 flex flex-col gap-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Label htmlFor="subtitle-offset" className="text-sm shrink-0 w-24 text-right">字幕偏移 (秒):</Label>
            <Slider
              id="subtitle-offset"
              value={[subtitleOffset]}
              min={-10} // Allow sufficient negative offset
              max={10}  // Allow sufficient positive offset
              step={0.01}
              onValueChange={(val) => setSubtitleOffset(val[0])}
              className="flex-1 w-full sm:w-auto"
              disabled={isLoading}
            />
            <Input
              type="number"
              step="0.01"
              value={subtitleOffset.toFixed(2)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  setSubtitleOffset(val);
                }
              }}
              className="w-24 text-center bg-gray-700 border-gray-600 text-white"
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Label htmlFor="playback-rate" className="text-sm shrink-0 w-24 text-right">播放速度:</Label>
            <Slider
              id="playback-rate"
              value={[playbackRate]}
              min={0.5}
              max={2.0}
              step={0.05}
              onValueChange={(val) => setPlaybackRate(val[0])}
              className="flex-1 w-full sm:w-auto"
              disabled={isLoading}
            />
            <Input
              type="number"
              step="0.05"
              value={playbackRate.toFixed(2)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  setPlaybackRate(Math.max(0.5, Math.min(2.0, val)));
                }
              }}
              className="w-24 text-center bg-gray-700 border-gray-600 text-white"
              disabled={isLoading}
            />
          </div>
          {/* Subtitle Font Size Setting */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Label htmlFor="subtitle-font-size" className="text-sm shrink-0 w-24 text-right">字幕文字大小:</Label>
            <Slider
              id="subtitle-font-size"
              value={[subtitleFontSize]}
              min={12} // Minimum font size
              max={36} // Maximum font size
              step={1} // Step by 1px
              onValueChange={(val) => setSubtitleFontSize(val[0])}
              className="flex-1 w-full sm:w-auto"
              disabled={isLoading}
            />
            <Input
              type="number"
              step="1"
              value={subtitleFontSize.toFixed(0)} // Display as integer
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  setSubtitleFontSize(Math.max(12, Math.min(36, val))); // Constrain value
                }
              }}
              className="w-24 text-center bg-gray-700 border-gray-600 text-white"
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {showSubtitles && getSubtitlesToDisplay.length > 0 && (
        <div className={cn(
          "absolute left-0 right-0 bg-black text-white p-4 rounded-t-lg text-center animate-fade-in",
          showSettingsPanel ? "bottom-[calc(100% + 220px)]" : "bottom-[calc(100%+0px)]"
        )} onClick={() => { setWordForSearch(null); setSearchButtonPosition(null); /* Clear search button on click outside word */ }}>
          {getSubtitlesToDisplay.map((cue) => (
            <p
              key={cue.id}
              className="leading-relaxed font-bold"
              style={{ fontSize: `${subtitleFontSize}px` }}
            >
              {highlightText(cue.text)}
            </p>
          ))}
        </div>
      )}

      {/* Search Button for non-highlighted word */}
      {wordForSearch && searchButtonPosition && onSearchWord && (
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            if (onSearchWord && wordForSearch) {
              onSearchWord(wordForSearch);
              // Clear the search button state after clicking search
              setWordForSearch(null);
              setSearchButtonPosition(null);
            }
          }}
          style={{
            position: 'fixed', // Use fixed to position relative to viewport
            left: searchButtonPosition.x + searchButtonPosition.width / 2, // Center above the word
            top: searchButtonPosition.y - 40, // Adjust 40px above the word (button height + some margin)
            transform: 'translateX(-50%)', // Center button horizontally
            zIndex: 90 // Ensure it's above audio player controls, but below dialogs
          }}
          className="px-3 py-1 rounded-full text-sm bg-blue-500 hover:bg-blue-600 text-white shadow-lg animate-fade-in"
        >
          搜索 "{wordForSearch}"
        </Button>
      )}
    </div>
  );
};

export default AudioPlayer;
