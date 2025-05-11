import React from 'react';
import { Loader2 } from 'lucide-react'; // Import Loader icon
import { Button } from '@/components/ui/button'; // Assuming Button component is available

interface AnalysisProcessingProps {
  taskStatus: 'submitting' | 'connecting' | 'polling' | 'completed' | 'failed';
  taskId: string | null;
  progress: number | null;
  statusMessage: string | null;
  error: any; // Store error object or message
  onCancelTask?: () => void; // Optional callback to cancel the task
}

const AnalysisProcessing: React.FC<AnalysisProcessingProps> = ({
  taskStatus,
  taskId,
  progress,
  statusMessage,
  error,
  onCancelTask,
}) => {

  // Determine the display text based on task status
  const statusText = {
    submitting: '提交中...',
    connecting: '连接中...',
    polling: '分析中...',
    completed: '完成',
    failed: '失败',
  }[taskStatus];

  // Determine if a loader should be shown
  const showLoader = taskStatus === 'submitting' || taskStatus === 'connecting' || taskStatus === 'polling';

  // Determine if the cancel button should be shown
  const showCancelButton = onCancelTask && (taskStatus === 'submitting' || taskStatus === 'connecting' || taskStatus === 'polling');


  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {showLoader ? (
        // Show loader while submitting, connecting, or polling
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
      ) : taskStatus === 'completed' ? (
        // Show success icon or message on completion (optional)
        <div className="text-green-500 text-4xl mb-4">✓</div> // Example success indicator
      ) : taskStatus === 'failed' ? (
        // Show error icon or message on failure (optional)
        <div className="text-red-500 text-4xl mb-4">✗</div> // Example failure indicator
      ) : null} {/* No icon for idle state */}

      {/* Display status text */}
      <p className="text-lg font-semibold mb-2">{statusText}</p>

      {/* Display task ID if available */}
      {taskId && (
        <p className="text-sm text-gray-600 mb-2">任务ID: {taskId}</p>
      )}

      {/* Display progress if available and not completed/failed */}
      {(progress !== null && (taskStatus === 'polling' || taskStatus === 'processing')) && (
          <p className="text-sm text-gray-600 mb-2">进度: {progress}%</p>
      )}

      {/* Display status message if available */}
      {statusMessage && (
          <p className="text-sm text-gray-600 mb-2">{statusMessage}</p>
      )}


      {/* Display error message if task failed */}
      {taskStatus === 'failed' && error && (
        <p className="text-sm text-red-500 mt-2">错误: {error.message || '未知错误'}</p>
      )}

      {/* Optional: Cancel button */}
      {showCancelButton && (
          <Button
              variant="outline"
              onClick={onCancelTask}
              className="mt-4"
              disabled={taskStatus === 'submitting'} // Disable cancel button while submitting
          >
              取消分析
          </Button>
      )}
    </div>
  );
};

export default AnalysisProcessing;
