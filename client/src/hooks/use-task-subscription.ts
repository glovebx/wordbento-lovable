import { useState, useEffect, useRef } from 'react';
import { WordDataType } from '@/types/wordTypes';
import { baseURL } from '@/lib/axios'; // Import the base URL

type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface TaskResult {
  status: TaskStatus;
  data?: WordDataType;
  error?: string;
  queuePosition?: number;
}

export const useTaskSubscription = (taskId: string | null) => {
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!taskId) {
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl: string;

    if (import.meta.env.DEV) {
        // In development, construct URL from the baseURL configured for HTTP requests
        const httpUrl = new URL(baseURL || window.location.origin);
        wsUrl = `${wsProtocol}//${httpUrl.host}/api/ws/tasks/${taskId}`;
    } else {
        // In production, use the same host as the web page
        wsUrl = `${wsProtocol}//${window.location.host}/api/ws/tasks/${taskId}`;
    }
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`WebSocket connected for task ${taskId}`);
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as TaskResult;
        console.log('Received task update:', message);
        setTaskResult(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setTaskResult({ status: 'failed', error: 'WebSocket connection error.' });
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected for task ${taskId}`);
      setIsConnected(false);
    };

    // Cleanup on component unmount or taskId change
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [taskId]);

  return { taskResult, isConnected };
};
