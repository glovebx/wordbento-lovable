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
} as const;

interface AudioPlayerProps {
  audioUrl: string;
  subtitleContent?: string;
  highlightWords?: string[];
  onClose: () => void;
  // New prop: Callback when a highlighted word is clicked
  onHighlightedWordClick?: (word: string, rect: DOMRect) => void; // Pass word and its bounding rect  
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, subtitleContent, highlightWords = [], onClose, onHighlightedWordClick }) => {
  // Fallback if useIsMobile is not defined or available
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

  // const [subtitleOffset, setSubtitleOffset] = useState(0); // Offset in 1.0x speed seconds
  // const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const lastCueIndex = useRef(-1); // Cache for last active cue index

  // Create a memoized instance of LocalStorageManager,
  // using audioUrl as the unique scope for this player's settings.
  // localStorageManager correctly memoized on resourceUUID
  const localStorageManager = useMemo(() => {
    // console.log('Creating new LocalStorageManager for UUID:', audioUrl); // Debugging line
    return new LocalStorageManager(`ap_${audioUrl}`);
  }, [audioUrl]);

  // Use a function for useState initial value to read from localStorage immediately
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    const storedRate = localStorageManager.getItem<number>(AUDIO_PLAYER_KEYS.PLAYBACK_RATE);
    return storedRate !== null ? storedRate : 1.0;
  });

  const [subtitleOffset, setSubtitleOffset] = useState<number>(() => {
    const storedOffset = localStorageManager.getItem<number>(AUDIO_PLAYER_KEYS.SUBTITLE_OFFSET);
    return storedOffset !== null ? storedOffset : 0;
  });
  // --- FIX ENDS HERE ---

  // Load settings from local storage on component mount or audioUrl change
  useEffect(() => {
    // Load playbackRate
    const storedPlaybackRate = localStorageManager.getItem<number>(AUDIO_PLAYER_KEYS.PLAYBACK_RATE);
    setPlaybackRate(storedPlaybackRate !== null ? storedPlaybackRate : 1.0);

    // Load subtitleOffset
    const storedSubtitleOffset = localStorageManager.getItem<number>(AUDIO_PLAYER_KEYS.SUBTITLE_OFFSET);
    setSubtitleOffset(storedSubtitleOffset !== null ? storedSubtitleOffset : 0);
  }, [audioUrl, localStorageManager]); 

  // Save settings to local storage whenever they change
  useEffect(() => {
    localStorageManager.setItem(AUDIO_PLAYER_KEYS.PLAYBACK_RATE, playbackRate);
  }, [playbackRate, localStorageManager]);

  useEffect(() => {
    localStorageManager.setItem(AUDIO_PLAYER_KEYS.SUBTITLE_OFFSET, subtitleOffset);
  }, [subtitleOffset, localStorageManager]);

  // Effect 1: Handles audio loading and reset (only when audioUrl changes)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      // These resets should ONLY happen when the audio source changes
      audio.pause();
      setIsPlaying(false);
      audio.currentTime = 0;
      setCurrentTime(0);
      setCurrentActiveCueIndex(null);
      setDuration(0); 
      // Set isLoading to true only when the audio source genuinely changes.
      // It will be set to false by the 'loadeddata' event.
      setIsLoading(true); 
    }
  }, [audioUrl]); // Only depends on audioUrl

  // Effect 2: Handles subtitle parsing (when subtitleContent or isMobile changes)
  useEffect(() => {
    if (subtitleContent) {
      try {
        // isMobile is a dependency here because parseSrt might behave differently
        // based on whether it's a mobile environment or not.
        const parsed = parseSrt(isMobile, subtitleContent); 
        setParsedCues(parsed.sort((a, b) => a.startTime - b.startTime));
      } catch (error) {
        console.error('SRT解析失败:', error);
        setParsedCues([]);
      }
    } else {
      setParsedCues([]);
    }
  }, [subtitleContent, isMobile]); // Depends on subtitleContent and isMobile

  // // Effect to reset player state when audioUrl changes
  // useEffect(() => {
  //   const audio = audioRef.current;
  //   if (audio) {
  //     // Pause current playback
  //     audio.pause();
  //     setIsPlaying(false);
      
  //     // Reset current time and related states
  //     audio.currentTime = 0;
  //     setCurrentTime(0);
  //     setCurrentActiveCueIndex(null);
  //     setDuration(0); // Reset duration until new audio is loaded
  //     // 运行中切换 isMobile 会造成isLoading一直是true
  //     setIsLoading(true); // Set loading true for the new audio

  //     // The `audio.src` will automatically update when the component re-renders
  //     // due to `audioUrl` prop change, which then triggers 'loadeddata' once ready.
  //   }
  //   // Also re-parse subtitles if subtitleContent might change with audioUrl
  //   if (subtitleContent) {
  //     try {
  //       const parsed = parseSrt(isMobile, subtitleContent);
  //       setParsedCues(parsed.sort((a, b) => a.startTime - b.startTime));
  //     } catch (error) {
  //       console.error('SRT解析失败:', error);
  //     }
  //   } else {
  //     setParsedCues([]);
  //   }

  // }, [audioUrl, subtitleContent, isMobile]); // Dependencies: audioUrl, isMobile (for subtitle parsing), subtitleContent

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
        for (let i = 1; i <= 2; i++) { // Check current + 1, current + 2
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
        for (let i = 1; i <= 2; i++) { // Check current - 1, current - 2
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

  const handleTimeUpdate = useCallback(
    // Reduce throttle interval to 33ms (approx 30fps) for smoother updates.
    // If issues persist, consider lowering to 16ms or removing throttle for debugging.
    throttle(() => {
      const audio = audioRef.current;
      if (!audio || isSliderDragging) return;

      const currentAudioTime = audio.currentTime; // This is time at current playbackRate
      setCurrentTime(currentAudioTime);
      
      // 正确公式：内容时间轴 = 实际时间 × 播放速率 + 字幕偏移
      // const contentTime = (currentAudioTime * playbackRate) + subtitleOffset;
      const contentTime = currentAudioTime + subtitleOffset;

      const activeCueIndex = findActiveCueOptimized(contentTime);

      setCurrentActiveCueIndex(activeCueIndex);

      // console.log(
      //   `实际: ${audio.currentTime.toFixed(2)}s | ` +
      //   `速率: ${playbackRate}x | ` +
      //   `内容: ${contentTime.toFixed(2)}s | ` +
      //   `字幕: ${activeCueIndex  ?? '无'}`
      // );

    }, 33), // Changed throttle to 33ms
    [isSliderDragging, findActiveCueOptimized, subtitleOffset, playbackRate]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedData = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      audio.playbackRate = playbackRate; // Ensure initial rate is set
    };

    const handlePlayPause = () => setIsPlaying(!audio.paused);

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentActiveCueIndex(null);
      setCurrentTime(0);
      audio.playbackRate = 1.0; // Reset rate on end
    };

    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlayPause);
    audio.addEventListener('pause', handlePlayPause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('play', handlePlayPause);
      audio.removeEventListener('pause', handlePlayPause);
      audio.removeEventListener('ended', handleEnded); // Remove the named function
      handleTimeUpdate.cancel();
    };
  }, [handleTimeUpdate, playbackRate]); // Dependencies for useEffect

  // useEffect(() => {
  //   if (subtitleContent) {
  //     try {
  //       const parsed = parseSrt(isMobile, subtitleContent);
  //       setParsedCues(parsed.sort((a, b) => a.startTime - b.startTime));
  //     } catch (error) {
  //       console.error('SRT解析失败:', error);
  //     }
  //   } else {
  //     setParsedCues([]);
  //   }
  // }, [subtitleContent, isMobile]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // This useEffect ensures the audio's playbackRate is updated when the state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;

      // 强制触发时间更新以重新计算字幕位置
      const event = new Event('timeupdate');
      audioRef.current.dispatchEvent(event);      
    }
  }, [playbackRate]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (audio) {
      audio[isPlaying ? 'pause' : 'play']();
    }
  };

  const onSliderValueChange = useCallback((value: number[]) => {
    setIsSliderDragging(true);
    setTempSliderValue(value[0]);
  }, []);

  const onSliderValueCommit = useCallback((value: number[]) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value[0];
      setCurrentTime(value[0]);
      
      // 正确公式：内容时间轴 = 拖动位置 × 播放速率 + 偏移
      const contentTime = value[0] + subtitleOffset;
      setCurrentActiveCueIndex(findActiveCueOptimized(contentTime));
    }
    setIsSliderDragging(false);
  }, [findActiveCueOptimized, subtitleOffset, playbackRate]);

  const formatTime = useCallback((time: number) => {
    if (isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const highlightText = useCallback((text: string) => {
    if (!highlightWords || highlightWords.length === 0) {
      return <span>{text}</span>;
    }

    const escapedHighlightWords = highlightWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const highlightRegex = new RegExp(`\\b(${escapedHighlightWords.join('|')})\\b`, 'gi');

    const parts = text.split(highlightRegex);

    return (
      <>
        {parts.map((part, index) => {
          const isHighlight = highlightWords.some(word => word.toLowerCase() === part.toLowerCase());
          if (isHighlight && onHighlightedWordClick) {
            return (
              <span
                key={index}
                className={cn(
                  isHighlight ? 'bg-yellow-300 text-black px-1 rounded cursor-pointer hover:bg-yellow-400 transition-colors' : '',
                )}
                onClick={(e) => {
                  // Prevent the click from propagating to parent elements if desired
                  e.stopPropagation();
                  // Call the callback with the word and its bounding rectangle
                  onHighlightedWordClick(part, e.currentTarget.getBoundingClientRect());
                }}
              >
                {part}
              </span>
            );
          }          
          return (
            <span
              key={index}
              className={cn(isHighlight ? 'bg-yellow-300 text-black px-1 rounded' : '')}
            >
              {part}
            </span>
          );
        })}
      </>
    );
  }, [highlightWords, onHighlightedWordClick]);

  const getSubtitlesToDisplay = useMemo(() => {
    if (currentActiveCueIndex === null || !showSubtitles) {
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
        </div>
      )}

      {showSubtitles && getSubtitlesToDisplay.length > 0 && (
        <div className={cn(
          "absolute left-0 right-0 bg-black text-white p-4 rounded-t-lg text-center animate-fade-in", // bg-black for solid background
          showSettingsPanel ? "bottom-[calc(100% + 120px)]" : "bottom-[calc(100%+0px)]"
        )}>
          {getSubtitlesToDisplay.map((cue) => (
            <p
              key={cue.id}
              className="text-lg leading-relaxed font-bold"
            >
              {highlightText(cue.text)}
              {/* Debugging: Display precise timestamps */}
              {/* <small className="opacity-50 block text-xs">
                {cue.startTime.toFixed(2)} - {cue.endTime.toFixed(2)}
              </small> */}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;