/**
 * 日语文本处理工具类
 * 提供语言检测、日语判断、智能分词等功能
 */
export class LanguageUtils {
  private static readonly HIRAGANA_RANGE = '\\u3040-\\u309F';
  private static readonly KATAKANA_RANGE = '\\u30A0-\\u30FF';
  private static readonly KANJI_RANGE = '\\u4E00-\\u9FAF';
  private static readonly ROMAJI_RANGE = 'a-zA-Z0-9';
  private static readonly PROLONGED_SOUND = 'ー';

  /**
   * 检测文本的语言类型
   * @param text 要检测的文本
   * @returns 语言类型：'english' | 'japanese' | 'mixed' | 'other'
   */
  public static detectLanguage(text: string): 'english' | 'japanese' | 'mixed' | 'other' {
    if (!text || text.trim().length === 0) return 'other';

    const hiraganaRegex = new RegExp(`[${this.HIRAGANA_RANGE}]`);
    const katakanaRegex = new RegExp(`[${this.KATAKANA_RANGE}]`);
    const kanjiRegex = new RegExp(`[${this.KANJI_RANGE}]`);
    const englishRegex = /[a-zA-Z]/;

    const hasJapanese = hiraganaRegex.test(text) || katakanaRegex.test(text) || kanjiRegex.test(text);
    const hasEnglish = englishRegex.test(text);

    if (hasJapanese && hasEnglish) return 'mixed';
    if (hasJapanese) return 'japanese';
    if (hasEnglish) return 'english';

    return 'other';
  }

  /**
   * 判断文本是否可能是日语
   * @param text 要检测的文本
   * @returns 是否是日语
   */
  public static isLikelyJapanese(text: string): boolean {
    if (!text) return false;

    // 日语特有的字符特征
    const japaneseIndicators = {
      hiragana: new RegExp(`[${this.HIRAGANA_RANGE}]`),
      katakana: new RegExp(`[${this.KATAKANA_RANGE}]`),
      japanesePunctuation: /[、。]/,
      prolongedSoundMark: new RegExp(this.PROLONGED_SOUND),
    };

    // 如果包含平假名或片假名，基本可以确定是日语
    if (japaneseIndicators.hiragana.test(text) || japaneseIndicators.katakana.test(text)) {
      return true;
    }

    // 仅包含汉字时，通过标点辅助判断
    if (japaneseIndicators.japanesePunctuation.test(text) || japaneseIndicators.prolongedSoundMark.test(text)) {
      return true;
    }

    return false;
  }

  /**
   * 基础日语分词功能
   * @param text 要分词的文本
   * @returns 分词后的字符串数组
   */
  public static segmentJapaneseText(text: string): string[] {
    if (!text || text.length === 0) return [];

    // 日语分词规则：按词语边界分割
    const japaneseWordRegex = new RegExp(
      // 1. 汉字序列（包括汉字重复）
      `[${this.KANJI_RANGE}]+` +
      // 2. 平假名词语（2个字符以上，避免分割助词）
      `|[${this.HIRAGANA_RANGE}]{2,}` +
      // 3. 片假名词语（包括长音、复合词）
      `|[${this.KATAKANA_RANGE}]+[${this.PROLONGED_SOUND}]?[${this.KATAKANA_RANGE}]*` +
      // 4. 英文单词
      `|[${this.ROMAJI_RANGE}]+` +
      // 5. 日文标点符号单独分割
      `|[、。]` +
      // 6. 其他字符（包括长音符号等）
      `|.`,
      'g'
    );

    const segments = text.match(japaneseWordRegex) || [];
    return segments.filter(segment => segment.trim() !== '');
  }

  /**
   * 高级日语分词功能（考虑语法结构）
   * @param text 要分词的文本
   * @returns 分词后的字符串数组
   */
  public static advancedJapaneseSegmentation(text: string): string[] {
    const basicSegments = this.segmentJapaneseText(text);
    const refinedSegments: string[] = [];

    // 进一步处理基本分词结果，合并可能的词语单元
    for (let i = 0; i < basicSegments.length; i++) {
      const current = basicSegments[i];
      const next = basicSegments[i + 1];

      // 尝试识别和合并常见的日语语法结构
      if (next && this.isLikelyJapaneseWordCombination(current, next)) {
        refinedSegments.push(current + next);
        i++; // 跳过下一个元素，因为已经合并
      } else {
        refinedSegments.push(current);
      }
    }

    return refinedSegments;
  }

  /**
   * 判断两个片段是否可能组成一个日语词语
   * @param current 当前片段
   * @param next 下一个片段
   * @returns 是否可能组成词语
   */
  public static isLikelyJapaneseWordCombination(current: string, next: string): boolean {
    // 常见的日语词语组合模式
    const combinationPatterns = [
      // 汉字 + 平假名（如：食べる、読み方）
      { 
        first: new RegExp(`[${this.KANJI_RANGE}]`), 
        second: new RegExp(`[${this.HIRAGANA_RANGE}]`) 
      },
      // 平假名 + 平假名（2字符以上，如：ところ、あまり）
      { 
        first: new RegExp(`[${this.HIRAGANA_RANGE}]{2,}`), 
        second: new RegExp(`[${this.HIRAGANA_RANGE}]`) 
      },
      // 片假名复合词（如：コンピューター、インターネット）
      { 
        first: new RegExp(`[${this.KATAKANA_RANGE}]+`), 
        second: new RegExp(`[${this.KATAKANA_RANGE}]`) 
      },
    ];

    return combinationPatterns.some(pattern => 
      pattern.first.test(current) && pattern.second.test(next)
    );
  }

  /**
   * 清理日语单词用于搜索
   * @param word 要清理的单词
   * @returns 清理后的单词
   */
  public static cleanJapaneseWordForSearch(word: string): string {
    if (!word) return '';

    // 定义日语有效字符（包括各种假名和汉字）
    const validJapaneseChars = /[ぁ-んァ-ン一-龠ａ-ｚＡ-Ｚ０-９ー～]+/g;
    const matches = word.match(validJapaneseChars);

    if (!matches) return '';

    const cleaned = matches.join('');

    // 对于纯英文数字，转换为小写；日语保持原样
    return /^[a-zA-Z0-9]+$/.test(cleaned) ? cleaned.toLowerCase() : cleaned;
  }

  /**
   * 获取文本的语言统计信息
   * @param text 要分析的文本
   * @returns 语言统计信息
   */
  public static getLanguageStatistics(text: string): {
    language: string;
    hiraganaCount: number;
    katakanaCount: number;
    kanjiCount: number;
    romajiCount: number;
    totalJapaneseChars: number;
  } {
    const hiraganaRegex = new RegExp(`[${this.HIRAGANA_RANGE}]`, 'g');
    const katakanaRegex = new RegExp(`[${this.KATAKANA_RANGE}]`, 'g');
    const kanjiRegex = new RegExp(`[${this.KANJI_RANGE}]`, 'g');
    const romajiRegex = /[a-zA-Z]/g;

    const hiraganaCount = (text.match(hiraganaRegex) || []).length;
    const katakanaCount = (text.match(katakanaRegex) || []).length;
    const kanjiCount = (text.match(kanjiRegex) || []).length;
    const romajiCount = (text.match(romajiRegex) || []).length;

    const totalJapaneseChars = hiraganaCount + katakanaCount + kanjiCount;

    return {
      language: this.detectLanguage(text),
      hiraganaCount,
      katakanaCount,
      kanjiCount,
      romajiCount,
      totalJapaneseChars
    };
  }

  /**
   * 判断文本是否包含日语字符
   * @param text 要检查的文本
   * @returns 是否包含日语字符
   */
  public static containsJapanese(text: string): boolean {
    if (!text) return false;
    
    const japaneseRegex = new RegExp(
      `[${this.HIRAGANA_RANGE}${this.KATAKANA_RANGE}${this.KANJI_RANGE}]`
    );
    
    return japaneseRegex.test(text);
  }

  /**
   * 提取文本中的日语部分
   * @param text 要处理的文本
   * @returns 提取出的日语部分数组
   */
  public static extractJapaneseParts(text: string): string[] {
    if (!text) return [];

    const japaneseRegex = new RegExp(
      `[${this.HIRAGANA_RANGE}${this.KATAKANA_RANGE}${this.KANJI_RANGE}]+`,
      'g'
    );

    return text.match(japaneseRegex) || [];
  }
}

// 默认导出
export default LanguageUtils;

// 命名导出（兼容 CommonJS 和 ES Module）
export const {
  detectLanguage,
  isLikelyJapanese,
  segmentJapaneseText,
  advancedJapaneseSegmentation,
  isLikelyJapaneseWordCombination,
  cleanJapaneseWordForSearch,
  getLanguageStatistics,
  containsJapanese,
  extractJapaneseParts
} = LanguageUtils;