import { useState, useCallback, useEffect, useRef } from 'react';
import { axiosPrivate } from "@/lib/axios"; // Adjust path to your axiosPrivate
import {
  AnalysisData,
  AnalysisSubmissionResponse,
  AnalysisStatusUpdate,
  AnalysisResult // Import AnalysisResult type
} from '@/types/analysisTypes'; // Import types
import axios, { AxiosError } from 'axios'; // Import Axios and AxiosError

/**
 * Custom hook to manage the lifecycle of an asynchronous analysis task
 * using initial HTTP submission and WebSocket for status updates.
 */
export const useAnalysisTask = () => {
  // State to track the overall loading/active status
  const [isLoading, setIsLoading] = useState(false);
  // State to track the specific status of the task
  const [taskStatus, setTaskStatus] = useState<'idle' | 'submitting' | 'connecting' | 'polling' | 'completed' | 'failed'>('idle');
  // State to store the task ID received from the backend
  const [taskId, setTaskId] = useState<string | null>(null);
  // State to store the final result data
  const [taskResult, setTaskResult] = useState<AnalysisResult | null>(null);
  // State to store any error that occurred
  const [error, setError] = useState<AxiosError | Error | null>(null);
  // State to store progress updates (optional)
  const [progress, setProgress] = useState<number | null>(null);
  // State to store status messages (optional)
  const [statusMessage, setStatusMessage] = useState<string | null>(null);


  // Ref to hold the WebSocket instance, persists across renders
  const wsRef = useRef<WebSocket | null>(null);

  // Function to clean up WebSocket connection
  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      console.log(`Closing WebSocket for task ID: ${taskId}`);
      try {
        wsRef.current.close();
      } catch (e: any) {
        console.error("Error during close current ws:", e);
      }
      wsRef.current = null;
    }
  }, [taskId]); // Dependency: taskId

  // // Effect to clean up WebSocket on component unmount or taskId change
  // useEffect(() => {
  //   return () => {
  //     closeWebSocket();
  //   };
  // }, [closeWebSocket]); // Dependency: closeWebSocket
    // Effect to clean up WebSocket on component unmount or when wsRef.current changes
  // Modified: Dependency is now wsRef.current
  useEffect(() => {
    const currentWs = wsRef.current; // Capture the current value of the ref for cleanup
    return () => {
      if (currentWs) {
          console.log(`Cleanup effect: Closing WebSocket for task ID: ${taskId}`); // Log taskId during cleanup
          currentWs.close();
      }
    };
  }, [wsRef.current]); // Dependency: wsRef.current - runs when the ref value changes

  // Function to initiate the analysis task
  const startAnalysis = useCallback(async (data: AnalysisData) => {
    // Reset states for a new task
    setIsLoading(true);
    setTaskStatus('submitting');
    setTaskId(null);
    setTaskResult(null);
    setError(null);
    setProgress(null);
    setStatusMessage(null);
    closeWebSocket(); // Close any previous WebSocket connection

    try {
      // 1. Submit the initial analysis request via HTTP POST
      // Assuming the backend endpoint is /api/analyze and it returns { id: 'task-id' }
      const submissionResponse = await axiosPrivate.post<AnalysisSubmissionResponse>('/api/analyze', data);

      if (submissionResponse.status === 200 || submissionResponse.status === 201) {
        const submittedTask = submissionResponse.data;
        if (submittedTask?.uuid) {
          const newTaskId = submittedTask.uuid;
          console.log(`Analysis task submitted successfully. Task ID: ${newTaskId}`);
          setTaskId(newTaskId); // Store the task ID
          setTaskStatus('connecting'); // Indicate that we are attempting to connect WS

          // 2. Open a WebSocket connection to receive status updates
          // Assuming the WebSocket endpoint is ws://your-backend-url/ws/analyze/:taskId
          // You might need to construct the WebSocket URL based on your environment and backend setup
          // Example: const wsUrl = `ws://localhost:8080/ws/analyze/${newTaskId}`;
          // For Cloudflare Workers, you might need a specific setup to expose a WebSocket endpoint
          // If your backend is also a Worker, you might need to use Durable Objects for WebSockets.
          // Placeholder URL construction:
          const backendBaseUrl = axiosPrivate.defaults.baseURL; // Get base URL from axios instance
          let wsProtocol = 'ws';
          if (backendBaseUrl?.startsWith('https')) {
              wsProtocol = 'wss'; // Use wss for HTTPS
          }
          // Assuming the WebSocket path is relative to the base URL
          const wsUrl = `${wsProtocol}://${new URL(backendBaseUrl || '').host}/ws/analyze/${newTaskId}`;
          console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);

          wsRef.current = new WebSocket(wsUrl);

          // 3. Set up WebSocket event listeners
          wsRef.current.onopen = () => {
            console.log(`WebSocket connection opened for task ID: ${newTaskId}`);
            setTaskStatus('polling'); // Connection successful, now polling
            setIsLoading(true); // Keep loading while polling
          };

          wsRef.current.onmessage = (event) => {
            console.log(`WebSocket message received for task ID ${newTaskId}:`, event.data);
            try {
              const update: AnalysisStatusUpdate = JSON.parse(event.data); // Parse the status update
              setTaskStatus(update.status); // Update task status
              if (update.progress !== undefined) setProgress(update.progress); // Update progress
              if (update.message !== undefined) setStatusMessage(update.message); // Update message

              if (update.status === 'completed') {
                console.log(`Task ID ${newTaskId} completed. Result:`, update.result);
                // result是json
                // const parsedResult: AnalysisResult = update.result ? JSON.parse(update.result as string) : null;
                setTaskResult(update.result || null); // Store the final result
                setIsLoading(false); // Task finished
                setError(null); // Clear any errors
                closeWebSocket(); // Close WebSocket on completion

              } else if (update.status === 'failed') {
                console.error(`Task ID ${newTaskId} failed:`, update.error);
                setTaskResult(null); // Clear result
                setError(new Error(update.error || 'Analysis task failed')); // Store the error
                setIsLoading(false); // Task finished
                closeWebSocket(); // Close WebSocket on failure
              }
              // For 'pending' or 'processing', just update status/progress/message
              // isLoading remains true

            } catch (parseError) {
              console.error(`Failed to parse WebSocket message for task ID ${newTaskId}:`, parseError);
              console.error("Received message data:", event.data);
              setTaskStatus('failed');
              setTaskResult(null);
              setError(new Error('Failed to parse status update from server.'));
              setIsLoading(false);
              closeWebSocket();
            }
          };

          wsRef.current.onerror = (event) => {
            console.error(`WebSocket error for task ID ${newTaskId}:`, event);
            // Error event doesn't always contain a specific message, rely on onclose for final state
            // setTaskStatus('failed'); // Don't set failed here, onclose will handle it
            // setError(new Error('WebSocket error occurred.'));
            // setIsLoading(false);
            // closeWebSocket(); // onclose will be called after onerror
          };

          wsRef.current.onclose = (event) => {
            console.log(`WebSocket connection closed for task ID ${newTaskId}. Code: ${event.code}, Reason: ${event.reason}`);
            // If the status is not already completed or failed, assume failure due to unexpected close
            if (taskStatus !== 'completed' && taskStatus !== 'failed') {
                 console.warn(`WebSocket closed unexpectedly for task ID ${newTaskId}.`);
                 setTaskStatus('failed');
                 setTaskResult(null);
                 setError(new Error(`WebSocket connection closed unexpectedly. Code: ${event.code}`));
                 setIsLoading(false);
            }
            wsRef.current = null; // Clear the ref
          };

        } else {
          // Initial submission successful but no task ID returned
          console.error("Analysis submission successful but no task ID received.");
          setTaskStatus('failed');
          setError(new Error("Analysis task submitted but no ID received from server."));
          setIsLoading(false);
        }
      } else {
        // Initial submission failed with non-success status code
        const err = new Error(`Initial submission failed with status ${submissionResponse.status}: ${submissionResponse.statusText}`);
        console.error("Initial analysis submission failed:", err);
        setTaskStatus('failed');
        setError(err);
        setIsLoading(false);
      }

    } catch (submitError: any) { // Catch errors during the initial submission request
      console.error("Error during initial analysis submission:", submitError);
      setTaskStatus('failed');
      setError(axios.isAxiosError(submitError) ? submitError : new Error(submitError.message || 'Initial submission failed'));
      setIsLoading(false);
    }
  }, [closeWebSocket]); // Dependency: closeWebSocket

  // Optional: Function to cancel the ongoing task (requires backend support)
  const cancelAnalysis = useCallback(async () => {
      if (taskId && (taskStatus === 'submitting' || taskStatus === 'connecting' || taskStatus === 'polling')) {
          console.log(`Attempting to cancel task ID: ${taskId}`);
          setIsLoading(true); // Keep loading while canceling
          setStatusMessage('Canceling task...');
          try {
              // Assuming a DELETE endpoint like /api/analyze/:taskId/cancel
              await axiosPrivate.delete(`/api/analyze/${taskId}/cancel`);
              console.log(`Cancel request sent for task ID: ${taskId}`);
              // Backend should ideally send a 'failed' status update via WS after receiving cancel request
              // If not, you might need to handle the state transition client-side after the DELETE request succeeds
              // setTaskStatus('failed'); // Or a 'canceling' status if you have one
              // setError(new Error('Task cancellation requested.'));
              // setIsLoading(false);
              // closeWebSocket(); // Close WS after sending cancel request
          } catch (cancelError: any) {
              console.error(`Failed to send cancel request for task ID ${taskId}:`, cancelError);
               setStatusMessage('Failed to send cancel request.');
               setIsLoading(false);
               // Optionally update error state
          }
      }
  }, [taskId, taskStatus, closeWebSocket]); // Dependencies: taskId, taskStatus, closeWebSocket


  // Return the function to start the analysis and relevant states
  return {
    startAnalysis,
    cancelAnalysis, // Expose cancel function
    isLoading,
    taskStatus,
    taskId,
    taskResult,
    error,
    progress, // Expose progress
    statusMessage, // Expose status message
  };
};
