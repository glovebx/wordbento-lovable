
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base64ToArrayBuffer } from '@/lib/audio';
import { axiosPrivate } from "@/lib/axios";

interface TtsPronunciationButtonProps {
  word: string;
  example?: string;
  className?: string;
}

const TtsPronunciationButton: React.FC<TtsPronunciationButtonProps> = ({ 
  word,
  example,
  className 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  // Ref to hold the AudioContext and AudioBufferSourceNode
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  // New: Ref to hold the audio cache
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  // Initialize AudioContext on component mount
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Cleanup: close AudioContext when component unmounts
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      // New: Clear the cache on unmount (optional, depends on app needs)
      audioCacheRef.current.clear();        
    };
  }, []);

  // Function to play an audio buffer
  const playAudioBuffer = useCallback(async (audioBuffer: ArrayBuffer) => {
    if (!audioContextRef.current) {
      console.error("AudioContext not initialized.");
      setIsPlaying(false);
      return;
    }

    // Stop any currently playing audio
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }

    try {
      // Decode audio data
      const decodedAudio = await audioContextRef.current.decodeAudioData(audioBuffer);

      // Create an AudioBufferSourceNode
      const source = audioContextRef.current.createBufferSource();
      source.buffer = decodedAudio;
      source.connect(audioContextRef.current.destination); // Connect to speakers

      // Set up onended event to reset playing state
      source.onended = () => {
        setIsPlaying(false);
        source.disconnect(); // Disconnect after playing
        audioSourceRef.current = null;
      };

      // Store the source node to allow stopping
      audioSourceRef.current = source;

      // Start playback
      source.start(0); // Play immediately
      setIsPlaying(true);

    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  }, []);

  const speakText = async () => {
    // If currently playing, stop it
    if (isPlaying) {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    // Set playing state to true immediately to show loading/active state
    setIsPlaying(true);

    try {
      // New: Check if audio is in cache
      const cachedBase64Audio = audioCacheRef.current.get(word);
      if (cachedBase64Audio) {
        const cachedAudioBuffer = base64ToArrayBuffer(cachedBase64Audio);
        console.log(`Cache hit for word: ${word}. Playing from cache.`);
        await playAudioBuffer(cachedAudioBuffer);
        return; // Exit after playing from cache
      }

      // --- Simulate fetching audio from a backend endpoint ---
      // In a real application, your backend would use @andresaya/edge-tts
      // to generate the audio for 'word' and send it back.
      const response = await axiosPrivate.post('/api/word/tts', JSON.stringify({
          text: word,
          example: example,
          voice: 'en-US-AriaNeural', // Example voice
          rate: '0',
          volume: '0',
          pitch: '0',
        })
      );

      if (!response.data) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const base64Audio = response.data.base64Audio;

      if (!base64Audio || typeof base64Audio !== 'string') {
        throw new Error("Backend did not return valid base64Audio string.");
      }

      // New: Store the fetched audio buffer in cache
      audioCacheRef.current.set(word, base64Audio);
      console.log(`Audio for word: ${word} cached.`);

      // Convert the Base64 string to an ArrayBuffer
      const audioBuffer = base64ToArrayBuffer(base64Audio);
      // Play the fetched audio buffer
      await playAudioBuffer(audioBuffer);

    } catch (error) {
      console.error("Error during TTS or audio playback:", error);
      setIsPlaying(false); // Reset playing state on error
    }
  };

  return (
    <button
      onClick={speakText}
      className={cn(
        'rounded-full p-2 transition-all bg-green-500 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 duration-200 ease-in-out',
        isPlaying ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5', // Example conditional styling
        className
      )}
      title={isPlaying ? '停止朗读' : '朗读单词'}
      disabled={!word || isPlaying} // Disable if no word or already playing
    >
      <Volume2
        className={cn(
          'h-6 w-6',
          isPlaying && 'animate-pulse-sound' // Example conditional animation
        )}
      />
    </button>
  );
};

export default TtsPronunciationButton;