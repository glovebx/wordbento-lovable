/**
 * Represents the structure of a word's content grouped by type and language,
 * derived from the 'word_content' table via backend processing.
 * Keys are content types (e.g., 'definition', 'etymology', 'examples', 'summary').
 * Values are objects where keys are language codes (e.g., 'en', 'zh', 'ja', 'ko')
 * and values are the content text (string) or a list of strings (string[]).
 * content 可以是文本、文本数组或数据库中为 NULL 的情况。
 */
export interface WordContentMap {
    [contentType: string]: {
      icon: string | null;
      [languageCode: string]: string | string[] | null; // Content can be text, array of texts, or null
    };
  }
  
  /**
   * Represents the full data structure for a single word returned by the backend API.
   * This structure is derived from joining and organizing data from the 'words'
   * and 'word_content' database tables based on the Drizzle schema.
   */
  export interface WordDataType {
    id: number; // Primary key from 'words' table (number as per Drizzle mode: 'number')
  
    // userId 字段通常是用于后端逻辑（如权限、过滤），
    // 如果前端不需要显示或直接使用用户 ID，则可以不包含。
    // 这里我们假设前端不需要直接展示单词属于哪个用户，所以不包含 userId。
    // 如果你需要 userId 在前端，可以加上: userId: number;
  
    word_text: string; // From 'words' table, unique and not null
    phonetic: string | null; // From 'words' table, nullable text
    meaning: string | null; 
  
    // Timestamps from 'words' table.
    // Drizzle maps SQLite DATETIME to text. These fields are nullable in the schema
    // (TEXT without NOT NULL), although DEFAULT CURRENT_TIMESTAMP makes them effectively non-null on insert.
    // API might return them as strings or null. Using string | null for safety.
    created_at: string | null;
    updated_at: string | null;
  
    // Aggregated content from 'word_content' table
    content: WordContentMap;
  }
  
  // 可以选择导出 WordContentMap 类型如果需要在其他地方直接引用它
  // export type WordContentMapType = WordContentMap;