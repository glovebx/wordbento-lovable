// components/AudioPlayer.tsx

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Subtitles, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { parseSrt, SubtitleCue } from '../utils/subtitleParser';
import { throttle } from 'lodash-es'; // 需要安装 lodash-es

interface AudioPlayerProps {
  audioUrl: string;
  subtitleContent?: string;
  onClose: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, subtitleContent, onClose }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [parsedCues, setParsedCues] = useState<SubtitleCue[]>([]);
  const [currentActiveCue, setCurrentActiveCue] = useState<SubtitleCue | null>(null);
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  const [tempSliderValue, setTempSliderValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // 新增加载状态

  // 缓存最近找到的字幕索引
  const lastCueIndex = useRef(-1);
  // const rafId = useRef<number>();

  // 优化后的二分查找+缓存方法
  const findActiveCueOptimized = useCallback(
    (time: number): SubtitleCue | null => {
      // 优先检查缓存索引附近的字幕
      if (lastCueIndex.current >= 0 && lastCueIndex.current < parsedCues.length) {
        const prevCue = parsedCues[lastCueIndex.current];
        if (prevCue && time >= prevCue.startTime && time < prevCue.endTime) {
          return prevCue;
        }
      }

      // 二分查找核心逻辑
      let low = 0;
      let high = parsedCues.length - 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const cue = parsedCues[mid];
        
        if (time >= cue.startTime && time < cue.endTime) {
          lastCueIndex.current = mid;
          return cue;
        } else if (time < cue.startTime) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
      return null;
    },
    [parsedCues]
  );

  // 节流处理的更新时间处理
  const handleTimeUpdate = useCallback(
    throttle(() => {
      const audio = audioRef.current;
      if (!audio || isSliderDragging) return;

      const currentAudioTime = audio.currentTime;
      console.log(`currentAudioTime === ${currentAudioTime}`);
      setCurrentTime(currentAudioTime);
      
      // 使用优化后的查找方法
      const activeCue = findActiveCueOptimized(currentAudioTime + 5.538);
      setCurrentActiveCue(activeCue);
    }, 100), // 100ms节流间隔
    [isSliderDragging, findActiveCueOptimized]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 音频元数据加载完成
    const handleLoadedData = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    // 播放状态同步
    const handlePlayPause = () => setIsPlaying(!audio.paused);

    // 事件监听
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlayPause);
    audio.addEventListener('pause', handlePlayPause);
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentActiveCue(null);
      setCurrentTime(0);
    });

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('play', handlePlayPause);
      audio.removeEventListener('pause', handlePlayPause);
      audio.removeEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentActiveCue(null);
        setCurrentTime(0);
      });
      handleTimeUpdate.cancel(); // 取消节流函数
    };
  }, [handleTimeUpdate]);

  // 解析字幕内容
  useEffect(() => {
    if (subtitleContent) {
      try {
        const parsed = parseSrt(subtitleContent);
        parsed.sort((a, b) => a.startTime - b.startTime);
        setParsedCues(parsed);
      } catch (error) {
        console.error('SRT解析失败:', error);
      }
    } else {
      setParsedCues([]);
    }
  }, [subtitleContent]);

  // 音量控制
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (audio) {
      audio[isPlaying ? 'pause' : 'play']();
    }
  };

  // 进度条拖动处理
  const onSliderValueChange = useCallback((value: number[]) => {
    setIsSliderDragging(true);
    setTempSliderValue(value[0]);
  }, []);

  const onSliderValueCommit = useCallback((value: number[]) => {

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value[0];
      setCurrentTime(value[0]);
    }
    setIsSliderDragging(false);
  }, []);

  // 时间格式化显示
  const formatTime = useCallback((time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  if (!audioUrl) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-4 shadow-lg z-50">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
        <audio ref={audioRef} src={audioUrl} preload="auto" />

        {/* 加载状态指示 */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="animate-pulse">加载音频中...</span>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSubtitles(!showSubtitles)}
            >
              <Subtitles
                className={cn("h-6 w-6", showSubtitles ? "text-blue-300" : "")}
              />
            </Button>
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

      {/* 字幕显示区域 */}
      {showSubtitles && currentActiveCue && (
        <div className="absolute bottom-[calc(100%+0px)] left-0 right-0 bg-black bg-opacity-80 text-white p-4 rounded-t-lg text-center animate-fade-in">
          <p className="text-lg leading-relaxed font-bold">
            {currentActiveCue.text}
          </p>
          {/* 显示精确时间戳（调试用） */}
          <small className="opacity-50">
            {currentActiveCue.startTime.toFixed(2)} -{' '}
            {currentActiveCue.endTime.toFixed(2)}
          </small>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;