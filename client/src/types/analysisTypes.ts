/**
 * Represents the data submitted by the analysis form.
 */
export interface AnalysisData {
    sourceType: 'url' | 'article'; // Source type: URL or article text
    content: string;               // The URL or the article text
    // examType: 'TOEFL' | 'GRE' | 'TOEIC' | 'SAT'; // Exam type
    examType: string;
  }
  
  /**
   * Represents the response from the initial task submission API.
   * Assumed format: { id: 'task-id' }
   */
  export interface AnalysisSubmissionResponse {
    uuid: string; // The unique ID of the submitted task
  }
  
  /**
   * Represents the status update received via WebSocket.
   * The 'status' field indicates the current state of the task.
   */
  export interface AnalysisStatusUpdate {
    uuid: string;                                // The ID of the task
    status: 'pending' | 'processing' | 'completed' | 'failed'; // Current status
    progress?: number;                         // Optional progress percentage (0-100)
    message?: string;                          // Optional status message
    result?: any;                              // Final result data if status is 'completed'
    error?: string;                            // Error message if status is 'failed'
  }
  
  /**
   * Represents the final result data when the task is completed.
   * Define this more specifically based on what your backend returns.
   */
  export interface AnalysisResult {
    // TODO: Define the actual structure of your analysis result data
    // For example:
    // words: string[];
    // difficultyScore: number;
    // summary: string;
    [key: string]: any; // Placeholder: replace with actual result structure
  }
  