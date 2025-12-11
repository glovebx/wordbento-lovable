import { Hono } from 'hono';
// Import necessary Drizzle functions. 'eq' and 'sql' are commonly used.
// Adjust imports based on your Drizzle setup if needed.
// Note: Drizzle ORM can be used with JavaScript, but type safety is lost.
// The 'schema' import is not needed in the JS runtime code itself,
// but the Drizzle client needs to be configured with the schema definition.
// Assuming your Drizzle client is configured elsewhere with the schema.
// For D1 with Drizzle, you typically initialize it like drizzle(env.DB, { schema });
// We'll keep the drizzle import and schema reference in the initialization.
import { and, eq, inArray, gt, lt, gte, lte, isNull, asc, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
// The schema object itself is usually defined in a separate file and imported for drizzle initialization
import * as schema from '../db/schema'; // Keep schema import for drizzle initialization
import { sql } from 'drizzle-orm'; // Import sql tag for raw SQL fragments like RANDOM() and LIKE
import { nanoid } from "nanoid";
import { jsonrepair } from 'jsonrepair';
import { fixUnescapedQuotesInJson, isQuoted, removeQuotes } from '../utils/languageParser';
import LanguageUtils from '../utils/languageUtils';
// // 导入 HTTPException 用于抛出 HTTP 错误
// import { HTTPException } from 'hono/http-exception';
import { checkAndConsumeFreeQuota, getLlmConfig } from '../utils/security';
import { toSqliteUtcString } from '../utils/dateUtils';

// Type definitions are removed in JavaScript

const word = new Hono();

// // 定义AI请求免费额度和过期时间（例如：24小时）
// const FREE_CALLS_LIMIT = 3;
// const TTL_SECONDS = 60 * 60 * 24; // 24小时
// const IP_KEY_PREFIX = 'quota-ip';

// /**
//  * 检查 IP 地址的免费调用额度，并根据结果更新 KV 或抛出异常。
//  * * @param c Hono Context 对象
//  * @param ip 请求的 IP 地址
//  * @param user 已登录的用户对象 (或 null)
//  */
// const checkAndConsumeFreeQuota = async (c, ip, isVisitor) => {
//     const kv = c.env.WORDBENTO_KV;
//     const ipKey = `${IP_KEY_PREFIX}-${ip}`;

//     // 1. 获取当前调用记录
//     const quotaData = await kv.get(ipKey, { type: 'json' });
//     let currentCount = quotaData ? quotaData.count : 0;

//     if (currentCount >= FREE_CALLS_LIMIT) {
//         // 额度已用完

//         // // 检查用户是否已登录
//         if (isVisitor) {
//             // 未登录，抛出需要登录的异常 (HTTP 401 Unauthorized)
//             throw new HTTPException(401, {
//                 message: "您已用完免费调用额度 (3/3)。请登录以获得更多使用机会。",
//                 status: 401
//             });
//         }

//         // // 已登录，但仍然额度用尽，提示使用自己的 API Key
//         // // 在实际应用中，这里可能还会检查用户是否有付费套餐等
//         // throw new HTTPException(402, { // 402 Payment Required 比较合适
//         //     message: "免费额度已用完 (3/3)。请在'个人资料'页面填写您自己的 Gemini API Key 以继续使用。",
//         //     status: 402
//         // });
//         return false;

//     } else {
//         // 2. 额度未用完，递增计数并更新 KV
//         currentCount += 1;
//         const newData = { count: currentCount, expires: Date.now() + (TTL_SECONDS * 1000) };
        
//         // 使用 put 方法更新 KV，并设置 TTL
//         await kv.put(ipKey, JSON.stringify(newData), { expirationTtl: TTL_SECONDS });
//         console.log(`IP ${ip} consumed quota: ${currentCount}/${FREE_CALLS_LIMIT}`);
        
//         // 如果是最后一次免费调用，给用户一个 Toast 提示
//         if (currentCount === FREE_CALLS_LIMIT) {
//              console.log(`IP ${ip} reached limit.`);
//              // 注意：这里无法直接在后端抛出 Toast，需要通过 HTTP 响应头或体通知前端
//              // 在实际项目中，您可能需要返回一个特定的响应码或在响应体中包含状态信息
//         }
//         return true;
//     }
// }

/**
 * Helper function to check if a string looks like a JSON object or array.
 * It performs a basic check by verifying if the string starts and ends with
 * curly braces {} or square brackets [].
 *
 * @param {string} str The string to check.
 * @returns {boolean} True if the string looks like JSON, false otherwise.
 */
export const isLikelyJsonString = (str) => {
  if (typeof str !== 'string' || str.length === 0) {
      return false;
  }
  const trimmedStr = str.trim();
  return (trimmedStr.startsWith('{') && trimmedStr.endsWith('}')) ||
         (trimmedStr.startsWith('[') && trimmedStr.endsWith(']'));
};


export const cleanAiJsonResponse = (rawResponse) => {
  if (!rawResponse || typeof rawResponse !== 'string') {
    return null;
  }

  const trimmedResponse = rawResponse.trim();

  // --- Modified Regex ---
  // Regex to find content within the FIRST ```json ... ``` or ``` ... ``` fence.
  // Uses a non-greedy match (.*?) and the 's' flag to match newlines.
  // Removed the negative lookahead to match the first occurrence.
  // Added \s* after (?:json\s*)? to match zero or more whitespace characters (including newline).
  const codeBlockRegex = /```(?:json\s*)?\s*(.*?)```/s; // Match ```json or ```, zero or more whitespace, non-greedy content, ```

  const match = trimmedResponse.match(codeBlockRegex);

  if (match && match[1]) {
    // match[1] contains the captured group, which is the content inside the fences
    const extractedContent = match[1].trim();
    console.log("Extracted content from code block:", extractedContent);

    // Optional: Perform a basic check if the extracted content looks like JSON
    // (Starts with { or [ and ends with } or ])
    if (isLikelyJsonString(extractedContent)) {
        return extractedContent;
    } else {
        console.warn("Extracted content does not look like JSON structure:", extractedContent);
        // Depending on strictness, you might return extractedContent anyway,
        // or return null. Let's return null if it doesn't look like JSON structure.
        return null;
    }

  } else {
    console.warn("No suitable markdown code block found in the response.");
    // If no code block is found, return null
    return null;
  }  
};

// Helper function to map Gemini AI response structure to database structure
// Type annotations removed
const mapGeminiToDbContent = (word_id, geminiData) => {
    const dbContentRecords = [];
    // Filter out keys that are not content types
    const content_types = Object.keys(geminiData).filter(key => key !== 'phonetic' && key !== 'meaning');

    console.log(geminiData);

    for (const type of content_types) {
      console.log(type);

        const content = geminiData[type]; // Access content directly

        console.log(content);

        if (content) {
            // Handle icon separately if needed, or include it in the content structure
            // For now, we'll include icon in the content object returned to frontend,
            // but the database schema doesn't store icons per content type.
            // If you need to store icons per content type in DB, you'd need to modify schema.

            // Filter out 'icon' when iterating languages
            const languages = Object.keys(content).filter(lang => lang !== 'icon');
            const icon = content['icon'] || '';

            for (const lang of languages) {
                const value = content[lang];

                if (value !== undefined && value !== null) { // Only insert if content exists for the language
                     // Store arrays (like examples) as JSON strings in the database
                    const contentToStore = Array.isArray(value) ? JSON.stringify(value) : String(value);

                    dbContentRecords.push({
                        word_id: word_id,
                        content_type: type, // e.g., 'definition', 'examples'
                        language_code: lang, // e.g., 'en', 'zh'
                        content: contentToStore, // Store as string or JSON string
                        icon: icon
                    });

                    // // Handle the 'meaning' field from Gemini AI response
                    // // We'll map it to a specific content type, e.g., 'summary'
                    // // Assuming meaning is a general summary, maybe link to definition/en
                    //  if (geminiData.meaning && type === 'definition' && lang === 'en') {
                    //      const summaryContent = Array.isArray(geminiData.meaning) ? JSON.stringify(geminiData.meaning) : String(geminiData.meaning);
                    //       dbContentRecords.push({
                    //         word_id: word_id,
                    //         content_type: 'summary', // Map 'meaning' to 'summary' content type
                    //         language_code: lang, // Or 'en' if meaning is always in English
                    //         content: summaryContent,
                    //         icon: icon
                    //     });
                    //  }
                }
            }
        }
    }
     return dbContentRecords;
};

// Helper function to format database results into the desired frontend structure
// Type annotations removed
const formatDbResultToWordResponse = (c, word, contentRecords, imageRecords) => {
    const content = {};
    let imagesUrls = [];
    if (imageRecords && imageRecords.length > 0) {
      imagesUrls = imageRecords.map(img => img.image_key.startsWith('http') ? img.image_key : `${c.env.VITE_BASE_URL}/api/word/image/${img.image_key}`)
    }

    contentRecords.forEach(record => {
        if (!content[record.content_type]) {
            content[record.content_type] = {};
        }
        // Parse JSON strings back to arrays for types like 'examples'
        try {
            // Check if content is a string before attempting JSON.parse
            const parsedContent = (record.content_type === 'examples' || record.content_type === 'forms') && typeof record.content === 'string' && isLikelyJsonString(record.content) ? JSON.parse(record.content) : record.content;
             content[record.content_type][record.language_code] = parsedContent;
        } catch (e) {
             console.error(`Failed to parse JSON content for word ${word.id}, type ${record.content_type}, lang ${record.language_code}:`, e);
             content[record.content_type][record.language_code] = record.content; // Fallback to raw string
        }
    });

    //  // Add icons from geminiData if the word was generated by AI.
    //  // Icons are not stored in the DB with the current schema.
    //  if (geminiData) {
    //   // Iterate through content types in the geminiData
    //   const geminiContentTypes = Object.keys(geminiData).filter(key => key !== 'phonetic' && key !== 'meaning');
    //   geminiContentTypes.forEach(type => {
    //       const geminiContent = geminiData[type];
    //       // Check if the content type exists in the formatted content (from DB records)
    //       // AND if the geminiData for this type includes an 'icon' property
    //       if (content[type] && geminiContent && typeof geminiContent === 'object' && geminiContent.icon) {
    //            // Add the icon to the formatted content object for this type
    //            // Note: This adds the icon at the content type level, matching the AI JSON structure
    //            content[type].icon = geminiContent.icon;
    //       }
    //   });
    // }
    // // If geminiData is null (meaning the word was fetched from the DB),
    // // icons will not be added by this function with the current DB schema.

    return {
        id: word.id,
        word_text: word.word_text,
        phonetic: word.phonetic,
        meaning: word.meaning,
        created_at: word.created_at,
        // updated_at: word.updated_at,
        content: content,
        imageUrls: imagesUrls
    };
};

/**
 * 从一组图片URL中读取每张图片的二进制流。
 * 2025/11/23，只取前2张图片
 * @param {string[]} imageUrls 包含图片URL的字符串数组。
 * @returns {Promise<ArrayBuffer[]>} 一个 Promise，解析为包含每张图片 ArrayBuffer 的数组。
 * 如果任何图片加载失败，该 Promise 将会 reject。
 */
const readImageBinaryStreams = async (imageUrls) => {  
  // const allResultsPromises = imageUrls.slice(0, 2).map(async (url) => {
  const allResultsPromises = imageUrls.map(async (url) => {
    try {
      console.log(`正在读取图片: ${url}`);
      const response = await fetch(url, {
        mode: 'cors' // 确保处理跨域请求，如果图片不在同一域
      });

      if (!response.ok) {
        // 如果HTTP请求不成功（例如404，500等），则返回包含错误信息的对象
        const errorMessage = `HTTP 错误: ${response.status} ${response.statusText}`;
        console.error(`无法加载图片 ${url}: ${errorMessage}`);
        return { url: url, error: errorMessage };
      }

      // 获取响应的二进制数据作为 ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      console.log(`成功读取图片: ${url}, 大小: ${arrayBuffer.byteLength} 字节`);
      return { url: url, data: arrayBuffer }; // 成功时返回数据
    } catch (error) {
      // 捕获网络错误或其他异常，返回包含错误信息的对象
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`读取图片 ${url} 失败:`, errorMessage);
      return { url: url, error: errorMessage }; // 失败时返回错误
    }
  });

  // Promise.all 会等待所有 Promise 完成，无论它们是成功还是解析为包含错误的对象
  const results = await Promise.all(allResultsPromises);

  console.log("所有图片加载尝试已完成。");
  return results;

  // const allResults = []; // 用于存储所有图片的读取结果
  
  // // 使用 for...of 循环实现串行读取
  // for (const url of imageUrls) {
  //   try {
  //     console.log(`正在读取图片: ${url}`);
  //     const response = await fetch(url, {
  //       mode: 'cors' // 确保处理跨域请求，如果图片不在同一域
  //     });

  //     if (!response.ok) {
  //       // 如果HTTP请求不成功（例如404，500等），则返回包含错误信息的对象
  //       const errorMessage = `HTTP 错误: ${response.status} ${response.statusText}`;
  //       console.error(`无法加载图片 ${url}: ${errorMessage}`);
  //       allResults.push({ url: url, error: errorMessage });
  //       continue; // 继续处理下一个URL
  //     }

  //     // 获取响应的二进制数据作为 ArrayBuffer
  //     const arrayBuffer = await response.arrayBuffer();
  //     console.log(`成功读取图片: ${url}, 大小: ${arrayBuffer.byteLength} 字节`);
  //     allResults.push({ url: url, data: arrayBuffer }); // 成功时存储数据
  //   } catch (error) {
  //     // 捕获网络错误或其他异常，返回包含错误信息的对象
  //     const errorMessage = error instanceof Error ? error.message : String(error);
  //     console.error(`读取图片 ${url} 失败:`, errorMessage);
  //     allResults.push({ url: url, error: errorMessage }); // 失败时存储错误
  //   }
  // }
  
  // return allResults; // 返回所有结果  
}

const repairAiResponseToJson = (messageContent) => {  
    console.log(`messageContent: ${ messageContent }`);

    let repairedJson = null;

    const jsonStr = cleanAiJsonResponse(messageContent)
    console.log(`jsonStr: ${ jsonStr }`);

    try {
      repairedJson = JSON.parse(jsonStr);
      console.log(`repairedJson 1: ${ repairedJson }`);
    } catch(error) {
      console.log('convert failed, try to repair json string');
      repairedJson = null;
    }

    if (!repairedJson) {
      let repairedStr;
      try {
        repairedStr = jsonrepair(jsonStr)
        console.log(`repairedStr: ${ repairedStr }`);
      } catch(error) {
        repairedStr = jsonStr;
        console.log('jsonrepair failed, fallback to jsonStr');
      }

      try {
        repairedJson = JSON.parse(repairedStr);
        console.log(`repairedJson 2: ${ repairedJson }`);
      } catch(error) {
        const repairedBadStr = fixUnescapedQuotesInJson(repairedStr)
        console.log(`repairedBadStr: ${ repairedBadStr }`);
        repairedJson = JSON.parse(repairedBadStr);
      }
    }

    // console.log(`jsonWord: ${ jsonWord }`);

    // Validate the structure of the received data if necessary
    return repairedJson;
}

const enPrompt = `给你一个英文单词，返回下列json格式的数据:
{
  "英文单词": {
    "phonetic": "美式音标标注",
    "meaning": "简洁的中文含义，作为副标题",
    "definition": {
      "icon": "BookOpen",
      "en": "详细的英文词义解释，包含用法和语境。",
      "zh": "对应的中文词义解释。"
    },
    "examples": {
      "icon": "FileText",
      "en": ["英文例句 1","英文例句 2","英文例句 3"],
      "zh": ["中文翻译 1","中文翻译 2","中文翻译 3"]
    },
    "etymology": {
      "icon": "Atom",
      "en": "该单词的词源分析，包括来自哪一种语言。",
      "zh": "词源的中文说明。"
    },
    "affixes": {
      "icon": "Layers",
      "en": "词缀分析（如前缀、后缀、词根），以及相关词汇的构成。",
      "zh": "词缀分析的中文说明。"
    },
    "history": {
      "icon": "History",
      "en": "单词的发展历史、文化背景及其用法的变迁。",
      "zh": "发展历史与文化背景的中文说明。"
    },
    "forms": {
      "icon": "ArrowUpDown",
      "en": "单词变形，列出各种形态。",
      "zh": "单词各种形态的中文说明。"
    },
    "memory_aid": {
      "icon": "Lightbulb",
      "en": "记忆辅助方法，例如一个无厘头的小故事或将单词字母拆解成一句有趣的话。",
      "zh": "记忆辅助方法的中文版。"
    },
    "trending_story": {
      "icon": "Newspaper",
      "en": "一句来自影视剧的、包含该单词的经典台词（不超过80个单词），并注明出处。",
      "zh": "台词的中文翻译及场景说明。",
    }
  }
}
单词:`;

const jaPrompt = `给你一个日文单词，返回下列json格式的数据:
{
  "日文单词": {
    "phonetic": "假名标注",
    "meaning": "简洁中文含义",
    "definition": {
          "icon": "BookOpen",
          "en": "日文词义解释（含用法和语境）",
          "zh": "对应中文解释"
    },
    "examples": {
          "icon": "FileText",
          "en": ["日文例句1", "日文例句2", "日文例句3"],
          "zh": ["中文翻译1", "中文翻译2", "中文翻译3"]
    },
    "etymology": {
          "icon": "Atom",
          "en": "词源分析（如汉语来源、和语演变、外来语适应）",
          "zh": "中文词源说明"
    },
    "affixes": {
          "icon": "Layers",
          "en": "词缀分析（汉字构成、接辞功能、复合词结构）",
          "zh": "中文词缀解释"
    },
    "history": {
          "icon": "History",
          "en": "历史演变与文化背景（如时代变迁、社会影响）",
          "zh": "中文历史与文化说明"
    },
    "forms": {
          "icon": "ArrowUpDown",
          "en": "变形列表（动词活用形、形容词变化、礼貌体等）",
          "zh": "中文变形说明"
    },
    "memory_aid": {
          "icon": "Lightbulb",
          "en": "记忆辅助内容，故事联想或假名拆解（日文版）",
          "zh": "记忆辅助内容（中文版）"
    },
    "trending_story": {
          "icon": "Newspaper",
          "en": "影视剧台词（日文原句，来源注明）",
          "zh": "台词中文翻译及剧情上下文"
    }
  }
}
单词:`; 

const generateBentoByAi = async (c, userId, word, isJapanese, hasFreeQuota) => {
  console.log(`Calling AI for word: ${word}`);

  let aiResponse = false;
  let llm = await getLlmConfig(c, 'gemini', userId, hasFreeQuota);

  if (llm[1]) {
    // 配置了gemini
    aiResponse = await generateBentoByPlatformAi(c, llm, word, isJapanese);
  }
  if (!aiResponse || !aiResponse[word]) {
    llm = await getLlmConfig(c, 'deepseek', userId, hasFreeQuota);
    if (llm[1]) {
      aiResponse = await generateBentoByPlatformAi(c, llm, word, isJapanese);
    }
  }

  return aiResponse;
}

// Placeholder function to call Gemini AI API
// Replace with your actual API call logic
// Type annotations removed
const generateBentoByPlatformAi = async (c, llm, word, isJapanese) => {
    console.log(`Calling ${llm[0]} AI for word: ${word}`);
    // This is a placeholder. You need to replace this with your actual API call.
    // Example using fetch:

    let AI_API_ENDPOINT = llm[1];
    let AI_API_KEY = llm[2];
    let AI_API_MODEL = llm[3];

    try {
//       const prompt = `
// 我给你一个单词，请从下列9个角度，返回json格式的数据。每个角度都要包含中文+英文，并根据该角度内容的含义，从"lucide-react"库中动态匹配上相应的图标。举例：热点故事跟关税相关的话，需要展示一个海关的图标：
// 1、该单词的美式音标。json的键为"phonetic"
// 2、该单词的简洁的中文含义，作为副标题。json的键为"meaning"
// 2、词义解释。json的键为"definition"
// 3、3个例句。json的键为"examples"
// 4、词源分析。json的键为"etymology"
// 5、词缀分析。json的键为"affixes"
// 6、发展历史和文化背景。json的键为"history"
// 7、单词变形，json的键为"forms"
// 8、记忆辅助，在两种思路种选择一种即可：a. 无厘头的笑话或者小故事，增强记忆；b.将单词拆解成字母，每个字母组合成新单词，最后组合成一句话，这句话要跟该单词有关联。json的键为"memory_aid"
// 9、电影台词，请根据单词从影视剧中选择一句包含该单词的台词（台词不要超过80个单词），并给出台词的中文翻译、台词的上下文和影视剧名称，中文+英文。json的键为"trending_story"。

// 举例，单词是"hurl"时，返回内容如下：

// {
// 	"hurl": {
//     phonetic: "/hɜːrl/",
//     meaning: "投掷、猛力抛出",
//     definition: {
//       icon: "BookOpen",    
//       en: "To throw or fling with great force, often in an aggressive manner. Can also refer to forcefully expressing harsh words or insults.",
//       zh: "用很大力气猛烈地抛、掷、扔；也可指激烈地表达尖锐的批评或侮辱性言论。"
//     },
//     examples: {
//       icon: "FileText",    
//       en: [
//         "The pitcher can hurl the baseball at over 95 miles per hour.",
//         "Protesters hurled stones at the police barricade.",
//         "The critic hurled accusations of plagiarism at the author."
//       ],
//       zh: [
//         "这位投手能以超过95英里每小时的速度投掷棒球。",
//         "抗议者向警方设置的路障投掷石块。",
//         "评论家对作者提出了抄袭的指控。"
//       ]
//     },
//     etymology: {
//       icon: "Atom",    
//       en: "The word 'hurl' comes from Middle English 'hurlen', which means 'to rush, dash against.' It's likely related to Old Norse 'hurra' meaning 'to whir or spin' and possibly connected to Low German 'hurreln' meaning 'to throw or hurl'.",
//       zh: "单词'hurl'来源于中古英语'hurlen'，意为'冲、猛撞'。它可能与古挪威语'hurra'(意为'呼啸或旋转')相关，也可能与低地德语'hurreln'(意为'抛或掷')有联系。"
//     },
//     affixes: {
//       icon: "Layers",
//       en: "The word 'hurl' is a base word without prefixes or suffixes. Related forms include: hurler (noun, person who hurls), hurling (gerund/present participle), hurled (past tense).",
//       zh: "'hurl'是一个没有前缀或后缀的基本词。相关形式包括：hurler（名词，投掷者），hurling（动名词/现在分词），hurled（过去式）。"
//     },
//     history: {
//       icon: "History",
//       en: "The concept of 'hurling' has been fundamental to human development, from primitive hunting techniques to warfare. In sports, hurling is also the name of an ancient Irish game dating back over 3,000 years, considered one of the world's oldest field games, where players use sticks (hurleys) to hit a small ball.",
//       zh: "'投掷'的概念对人类发展至关重要，从原始狩猎技术到战争都离不开它。在体育领域，'hurling'也是一种有着3000多年历史的爱尔兰古老运动的名称，被认为是世界上最古老的场地运动之一，运动员使用木棍（hurleys）击打小球。"
//     },
//     forms: {
//       icon: "ArrowUpDown",
//       en: "Present: hurl, hurls\nPast: hurled\nPast participle: hurled\nPresent participle: hurling\nNouns: hurler (person), hurl (the act)",
//       zh: "现在式：hurl, hurls\n过去式：hurled\n过去分词：hurled\n现在分词：hurling\n名词：hurler（投掷者），hurl（投掷行为）"
//     },
//     memory_aid: {
//       icon: "Lightbulb",
//       en: "Think of 'hurl' as 'H-U-Really Launch' something. The 'H' stands for 'high' and 'U' for 'up' - when you hurl something, you're really launching it high up with force!",
//       zh: "将'hurl'想象成'H-U-Really Launch'（真正发射）。'H'代表'high'（高），'U'代表'up'（向上）——当你hurl某物时，你是真的在用力将它高高发射出去！"
//     },
//     trending_story: {
//       icon: "Newspaper",
//       en: "In recent Olympic discussions, analysts noted how social media has transformed the way we perceive sports like javelin throwing. \"Athletes no longer just hurl spears for distance,\" commented sports psychologist Dr. Mei Zhang. \"They hurl themselves into viral fame with every throw.\" This phenomenon highlights how traditional feats of strength now combine with digital presence, as Olympic hopefuls hurl not just physical objects but their personal brands into the global spotlight.",
//       zh: "在最近的奥运会讨论中，分析人士注意到社交媒体已经改变了我们看待标枪等运动的方式。体育心理学家梅·张博士评论道：\"运动员不再仅仅为了距离而投掷标枪，每一次投掷都将自己推向病毒式的网络名声。\"这种现象突显了传统力量表演如何与数字存在相结合，奥运会希望者不仅投掷实物，还将个人品牌推向全球聚光灯下。"
//     }
//   }
// }

// 现在我给你单词"${word}"，请返回json。
//                 `;
      const prompt = (isJapanese ? jaPrompt : enPrompt) + word;


        // const jsonData = {
        //   contents:[
        //     {
        //       parts:[
        //         {
        //           text: prompt
        //         }
        //       ]
        //     }
        //   ]};

        // const response = await fetch(GEMINI_API_ENDPOINT, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         // 'Authorization': `Bearer ${GEMINI_API_KEY}`
        //     },
        //     body: JSON.stringify(jsonData),
        // });

        // if (!response.ok) {
        //     console.error(`Gemini AI API call failed: ${response.status} ${response.statusText}`);
        //     return null;
        // }

        // const data = await response.json(); // No type assertion needed in JS
        // // console.log(data);

        // // ['candidates'][0]['content']['parts']]
        // console.log(data.candidates[0].content);

        // const result = data.candidates[0].content.parts[0];
        
        // console.log(result);

        // const jsonStr = cleanAiJsonResponse(result.text)

        const jsonData = {
          model: AI_API_MODEL,
          messages:[
            {role: 'system', content: 'You are a professional proficient in multiple languages, including Chinese, English, Japanese, and more.'},
            {role: 'user', content: prompt},
          ]};
  
        const response = await fetch(AI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`
            },
            body: JSON.stringify(jsonData),
        });
  
        if (!response.ok) {
            console.error(`${llm[0]} AI API call failed: ${response.status} ${response.statusText}`);
            return null;
        }
  
        const data = await response.json(); // No type assertion needed in JS
        console.log(data);
  
        // 2. Check if the 'choices' array exists and is not empty
        if (!data.choices || data.choices.length === 0) {
          console.error("API call failed: Response does not contain any choices.");
          // Handle this case
          // You might want to log the full response here to debug what was received
          console.log("Full response:", data);
          return null; // Or throw an error
        }
  
        // 3. Check if the first choice contains a message
        if (!data.choices[0].message) {
            console.error("API call failed: The first choice does not contain a message.");
             // Handle this case
             console.log("Full response:", data);
            return null; // Or throw an error
        }
  
        // If all checks pass, access and log the message content
        const messageContent = data.choices[0].message.content;
        console.log("API call successful. Received message:");
        // console.log(`messageContent: ${ messageContent }`);
  
        // let repairedJson = null;

        // const jsonStr = cleanAiJsonResponse(messageContent)
        // console.log(`jsonStr: ${ jsonStr }`);

        // try {
        //   repairedJson = JSON.parse(jsonStr);
        //   console.log(`repairedJson: ${ repairedJson }`);
        // } catch(error) {
        //   repairedJson = null;
        // }

        // if (!repairedJson) {
        //   let repairedStr;
        //   try {
        //     repairedStr = jsonrepair(jsonStr)
        //     console.log(`repairedStr: ${ repairedStr }`);
        //   } catch(error) {
        //     repairedStr = jsonStr;
        //     console.log('jsonrepair failed, fallback to jsonStr');
        //   }

        //   try {
        //     repairedJson = JSON.parse(repairedStr);
        //     console.log(`repairedJson: ${ repairedJson }`);
        //   } catch(error) {
        //     const repairedBadStr = fixUnescapedQuotesInJson(repairedStr)
        //     console.log(`repairedBadStr: ${ repairedBadStr }`);
        //     repairedJson = JSON.parse(repairedBadStr);
        //   }
        // }

        // // console.log(`jsonWord: ${ jsonWord }`);

        // // Validate the structure of the received data if necessary
        // return repairedJson;
        return repairAiResponseToJson(messageContent);

    } catch (error) {
        console.error(`Network error calling ${llm[0]} AI API:`, error);
        return null;
    }
    
    // // --- Mock AI Response for Testing ---
    // // Remove this mock data in your actual implementation
    //  console.warn("Using MOCK Gemini AI response!");
    //  const mockResponse = { // Removed type annotation
    //      [word.toLowerCase()]: { // Ensure the key matches the requested word slug
    //          phonetic: "/mɒk/",
    //          meaning: "模拟数据",
    //          definition: { icon: "BookOpen", en: "This is a mock definition.", zh: "这是一个模拟定义。" },
    //          examples: { icon: "FileText", en: ["Mock example 1.", "Mock example 2."], zh: ["模拟例句 1。", "模拟例句 2。"] },
    //          etymology: { icon: "Atom", en: "Mock etymology.", zh: "模拟词源。" },
    //          affixes: { icon: "Layers", en: "Mock affixes.", zh: "模拟词缀。" },
    //          history: { icon: "History", en: "Mock history.", zh: "模拟历史。" },
    //          forms: { icon: "ArrowUpDown", en: ["Mock form 1", "Mock form 2"], zh: ["模拟形式 1", "模拟形式 2"] },
    //          memory_aid: { icon: "Lightbulb", en: "Mock memory aid.", zh: "模拟记忆辅助。" },
    //          trending_story: { icon: "Newspaper", en: "Mock trending story.", zh: "模拟热门故事。" },
    //          // Add other content types as needed
    //      }
    //  };
    //  return Promise.resolve(mockResponse);
    // // --- End Mock AI Response ---
};

// 废弃，效果很差
const generateImageByGeminiAi = async (c, word) => {
  console.log(`Calling Gemini AI for word: ${word}`);
  // This is a placeholder. You need to replace this with your actual API call.
  // Example using fetch:

  const AI_API_KEY = c.env.GEMINI_API_KEY
  const AI_API_ENDPOINT = `${c.env.GEMINI_API_IMAGE_ENDPOINT}?key=${GEMINI_API_KEY}`

  try {
    const prompt = `
你是一名资深的创意工作者。现在我给你一个单词"${word}"，请根据单词的含义，结合当前的时事热点创作一张图片，配色或者图片形式要能够吸引眼球，帮我加深记忆。
仅返回图片数据，不要包含任何其他文本或解释。
              `;

        const jsonData = {
          contents:[
            {
              parts:[
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {responseModalities: ["TEXT", "IMAGE"]}
        };

        const response = await fetch(AI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${AI_API_KEY}`
            },
            body: JSON.stringify(jsonData),
        });

        if (!response.ok) {
            console.error(`Gemini AI API call failed: ${response.status} ${response.statusText}`);
            return null;
        }

        // console.log(jsonData);

        const data = await response.json(); // No type assertion needed in JS
        // console.log(data);

        // 2. Check if the 'choices' array exists and is not empty
        if (!data.candidates || data.candidates.length === 0) {
          console.error("API call failed: Response does not contain any candidates.");
          // Handle this case
          // You might want to log the full response here to debug what was received
          console.log("Full response:", data);
          return null; // Or throw an error
        }
  
        // 3. Check if the first choice contains a message
        if (!data.candidates[0].content) {
            console.error("API call failed: The first choice does not contain a content.");
             // Handle this case
             console.log("Full response:", data);
            return null; // Or throw an error
        }

        // 4.
        const parts = data.candidates[0].content.parts
        if (!parts || parts.length === 0) {
          console.error("API call failed: Response does not contain any parts.");
          // Handle this case
          // You might want to log the full response here to debug what was received
          console.log("Full response:", data);
          return null; // Or throw an error
        }

        for (const part of parts) {
          if (part.inlineData) {
            // console.log(`part.inlineData>>> ${part.inlineData} <<<`);

            // const jsonImage = JSON.parse(jsonStr);
            // const imageData = part.inlineData.data;

            // console.log(imageData);

            // Validate the structure of the received data if necessary
            return part.inlineData;            
          }
        }
        
        console.error("API call failed: Response does not contain any inlineData.");
        console.log("Full response:", data);

        return null;

      //   const jsonStr = cleanAiJsonResponse(result.text)

      //   console.log(jsonStr);
      // // const repairedStr = jsonrepair(jsonStr)
      // // console.log(repairedStr);

      // // const jsonImage = JSON.parse(jsonStr);
      // const imageData = result.inlineData.data;

      // console.log(imageData);

      // // Validate the structure of the received data if necessary
      // return imageData;

  } catch (error) {
      console.error('Network error calling Gemini Image AI API:', error);
      return null;
  }
  
};

function extractHttpLinks(text) {
  // Ensure the input is a string
  if (typeof text !== 'string') {
    console.error("Input must be a string.");
    return [];
  }

  // Regex explanation:
  // (https?:\/\/)  - Matches "http://" or "https://" (protocol part)
  // (?:             - Start of a non-capturing group for the rest of the URL
  //   [^\s"]+       - Matches one or more characters that are NOT whitespace or a double quote
  // )+              - The non-capturing group must appear one or more times
  // This regex is designed to capture the URL from the protocol up to the first whitespace or double quote.
  // It's a common pattern for URLs, but might need refinement for extremely complex cases
  // (e.g., URLs with spaces that are properly encoded, or URLs within other complex syntax).
  // For the provided example (Markdown image URLs), this regex works because the URL is
  // within parentheses and doesn't contain spaces.
  const urlRegex = /(https?:\/\/[^\s"]+)/g;

  const links = [];
  let match;

  // Use exec() in a loop to find all matches
  while ((match = urlRegex.exec(text)) !== null) {
    // match[0] is the full match (the entire URL string)
    links.push(match[0]);
  }

  return links;
}

// 海报风格
const posterStyle = 
[
{
    "style": "vintage travel poster",
    "desc": "复古旅行海报"
  },
  {
    "style": "cyberpunk graphic design",
    "desc": "赛博朋克风格"
  },
  {
    "style": "watercolor and ink painting",
    "desc": "水墨水彩风格"
  },
  {
    "style": "psychedelic art",
    "desc": "迷幻艺术"
  },
  {
    "style": "Ink drawing and watercolor wash, loose lines, soft color bleeds",
    "desc": "墨水笔触与水彩渲染，线条洒脱，颜色柔和晕染 - 适合：诗意、自然、情感细腻的单词"
  },
  {
    "style": "Woodcut print style, bold lines, high contrast, textured paper",
    "desc": "木刻版画风格，线条粗犷，高对比度，带纹理纸张 - 适合：有力、古老、有警示或寓言意味的单词"
  },
  {
    "style": "Soft pastel drawing, chalky texture, dreamy and muted colors",
    "desc": "柔和粉彩画，粉质感纹理，梦幻柔和的色彩 - 适合：温柔、梦幻、童年回忆相关的单词"
  },
  {
    "style": "Ukiyo-e style, flat areas of color, strong outlines, classic Japanese art",
    "desc": "浮世绘风格，平涂色彩，强烈的轮廓线，经典日本艺术 - 适合：日文单词，或与东方文化、自然景观相关的词汇"
  },
  {
    "style": "Minimalist, monochromatic, uses a single color with plenty of negative space",
    "desc": "极简主义，单色调，大量留白 - 适合：概念抽象、哲学思辨的单词"
  },
  {
    "style": "Abstract liquid art, fluid shapes, ink in water, vibrant color merges",
    "desc": "抽象液态艺术，流动形态，水墨交融，色彩 vibrant 融合 - 适合：表达情感、变化、潜意识或科学概念的单词"
  },
  {
    "style": "Neo-pop art, bold outlines, saturated colors, halftone patterns",
    "desc": "新波普艺术，粗轮廓线，高饱和色彩，网点图案 - 适合：流行、时尚、富有活力甚至带点反叛的单词"
  },
  {
    "style": "Bauhaus design, geometric shapes, primary colors, clean typography",
    "desc": "包豪斯设计，几何图形，三原色，干净的版式 - 适合：与设计、结构、理性相关的单词"
  },
  {
    "style": "Art Deco, geometric patterns, metallic accents, elegant and sleek",
    "desc": "装饰风艺术，几何图案，金属质感，优雅流畅 - 适合：奢华、精致、充满“爵士时代”风情的单词"
  },
  {
    "style": "Mid-century modern illustration, organic shapes, earthy tones",
    "desc": "中世纪现代风格插画，有机形态，大地色系 - 适合：家居、温馨、复古未来主义相关的单词"
  },
  {
    "style": "Swiss Style poster, asymmetric layout, clean typography, photo collage",
    "desc": "瑞士平面设计风格，不对称布局，干净字体，照片拼贴 - 适合：需要强版式设计感、信息清晰的单词"
  },
  {
    "style": "Gothic style, intricate blackwork, occult symbolism, dramatic lighting",
    "desc": "哥特风格，复杂的黑色图案，神秘符号，戏剧性光线 - 适合：黑暗、神秘、古典、与神话或魔法相关的单词"
  },
  {
    "style": "Bioluminescent, deep sea creatures, glowing in the dark, ethereal",
    "desc": "生物发光，深海生物，暗处发光，空灵 - 适合：神秘、未知、美丽而诡异的事物"
  },
  {
    "style": "Glitch art, digital distortion, RGB shift, corrupted data aesthetics",
    "desc": "故障艺术，数字失真，RGB 色彩分离，数据错误美学 - 适合：表达混乱、错误、数字时代或解构意义的单词"
  },
  {
    "style": "Synthwave, retro-futuristic, grid lines, neon colors, digital sunset",
    "desc": "合成波普，复古未来主义，网格线，霓虹色彩，数字日落 - 适合：怀旧、电子乐、80年代流行文化相关的单词"
  },
  {
    "style": "Cybernetic organic, blending flesh and machinery, intricate details",
    "desc": "赛博格有机体，血肉与机械融合，复杂细节 - 适合：探讨人性、科技、进化等深刻主题的单词"
  }
]

const generateImageByAi = async (c, userId, word, phonetic, example, language, hasFreeQuota) => {
  console.log(`Calling AI for image: ${word}`);

  let imageUrls = [];
  let llm = await getLlmConfig(c, 'dreamina', userId, hasFreeQuota);
  if (llm[1]) {
    imageUrls = await generateImageByDreaminaAi(c, word, phonetic, example, language);
  }
  if (!imageUrls || imageUrls.length == 0) {
    llm = await getLlmConfig(c, 'jimeng', userId, hasFreeQuota);
    if (llm[1]) {
      // 配置了jimeng
      imageUrls = await generateImageByJiMengAi(c, word, phonetic, example, language);
    }
    if (!imageUrls || imageUrls.length == 0) {
      llm = await getLlmConfig(c, 'seedream', userId, hasFreeQuota);
      if (llm[1]) {
        imageUrls = await generateImageBySeeDreamAi(c, word, phonetic, example, language);
      }
    }
  }
  return imageUrls;
}

const generateImageByDreaminaAi = async (c, word, phonetic, example, language) => {
  console.log(`Calling Dreamina AI for word: ${word} ${example}`);

  const AI_API_KEY = c.env.DREAMINA_API_KEY;
  const AI_API_ENDPOINT = c.env.DREAMINA_API_ENDPOINT;
  const AI_API_MODEL = c.env.DREAMINA_API_MODEL;

  try {
    const randomIndex = Math.floor(Math.random() * posterStyle.length);
    const style = posterStyle[randomIndex].style;

    // const prompt = example && `"${example}"，根据这句话创作一张图片，要足够吸引眼球，加深对该单词的记忆。图片标题："${word}"，副标题"${example}"` || `你是一名资深的创意工作者。现在我给你一个单词"${word}"，请根据单词的含义创作图片，配色或者图片形式要能够吸引眼球，帮我加深记忆。`
    const prompt = example && generatePosterPromptWithExample(word, language, phonetic, example, style) || generatePosterPromptWithoutExample(word, language, phonetic, style);

      const jsonData = {
        model: AI_API_MODEL || '',
        prompt: prompt,          
        ratio: "9:16",
        resolution: "1k",
      };        

      const response = await fetch(AI_API_ENDPOINT, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${AI_API_KEY}`
          },
          body: JSON.stringify(jsonData),
      });

      if (!response.ok) {
          console.error(`Dreamina AI API call failed: ${response.status} ${response.statusText}`);
          return null;
      }

      // console.log(jsonData);

      const data = await response.json(); // No type assertion needed in JS
      console.log(data);

      // 2. Check if the 'choices' array exists and is not empty
      if (!data.data || data.data.length === 0) {
        console.error("API call failed: Response does not contain any choices.");
        console.log("Full response:", data);
        return null; // Or throw an error
      }

      const imageUrls = data.data.map(d => d.url)
      
      console.log("Contents imageUrls:", imageUrls);  

      return imageUrls;

  } catch (error) {
      console.error('Network error calling Dreamina Image AI API:', error);
      return null;
  }
};


// 高级版本海报提示词生成函数（带例句）
const generatePosterPromptWithExample = (
  word, 
  language,
  pronunciation, 
  exampleSentence, 
  style = null,
  additionalInstructions = ""
) => {
    // 默认风格
    if (!style) {
        style = "modern minimalist poster, high quality, cinematic lighting, visually striking";
    }  
  // 基础提示词模板
  let prompt = `Conceptual poster design for ${language} word: "${word}". main title: "${word}", subtitle: "${pronunciation}". 
  The entire scene should visually interpret and embody the meaning and mood of the sentence: "${exampleSentence}". 
  Use a layout that integrates the text seamlessly into the image. The title "${word}" should be large, bold, and artistic at the top. 
  The pronunciation "${pronunciation}" should be smaller and elegantly placed below the title. 
  The full sentence "${exampleSentence}" should be incorporated as a design element within the scene, It is crucial that the text remains highly legible—ensure clear fonts, strong contrast with the background, and an appropriate size/layout that prioritizes readability.
  Style: ${style}`;
  
  // 添加额外指令（如果有）
  if (additionalInstructions) {
    prompt += `\nAdditional instructions: ${additionalInstructions}`;
  }
  
  return prompt;
};

// 没有例句的高级版本，支持额外参数
const generatePosterPromptWithoutExample = (
  word, 
  language,
  pronunciation, 
  style = null, 
  additionalInstructions = "") => {
    // 默认风格
    if (!style) {
        style = "modern minimalist poster, high quality, cinematic lighting, visually striking";
    }
    
    let prompt = `Conceptual poster design for ${language} word: "${word}".
The entire composition must be a visual definition and embodiment of the word's core meaning and essence.
The main title "${word}" should be large, bold, and artistically integrated as the focal point.
Directly below it, elegantly display the pronunciation: "${pronunciation}".
The style and imagery of the entire poster should intuitively communicate the feeling and concept of "${word}"
to someone who doesn't know the language. Avoid literal clichés, strive for a clever and evocative visual metaphor.
Style: ${style}`;
    
    // 添加额外指令（如果有）
    if (additionalInstructions) {
        prompt += `\n${additionalInstructions}`;
    }
    
    return prompt;
};

const generateImageByJiMengAi = async (c, word, phonetic, example, language) => {
  console.log(`Calling JiMeng AI for word: ${word} ${example}`);
  // This is a placeholder. You need to replace this with your actual API call.
  // Example using fetch:

  const AI_API_KEY = c.env.JIMENG_API_KEY;
  const AI_API_ENDPOINT = c.env.JIMENG_API_ENDPOINT;

  try {
    const randomIndex = Math.floor(Math.random() * posterStyle.length);
    const style = posterStyle[randomIndex].style;

    // const prompt = example && `"${example}"，根据这句话创作一张图片，要足够吸引眼球，加深对该单词的记忆。图片标题："${word}"，副标题"${example}"` || `你是一名资深的创意工作者。现在我给你一个单词"${word}"，请根据单词的含义创作图片，配色或者图片形式要能够吸引眼球，帮我加深记忆。`
    const prompt = example && generatePosterPromptWithExample(word, language, phonetic, example, style) || generatePosterPromptWithoutExample(word, language, phonetic, style);

        const jsonData = {
          model: '',
          stream: false,
          messages:[
            {role: 'user', content: prompt}
          ]
        };    

        const response = await fetch(AI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`
            },
            body: JSON.stringify(jsonData),
        });

        if (!response.ok) {
            console.error(`JiMeng AI API call failed: ${response.status} ${response.statusText}`);
            return null;
        }

        // console.log(jsonData);

        const data = await response.json(); // No type assertion needed in JS
        // console.log(data);

        // 2. Check if the 'choices' array exists and is not empty
        if (!data.choices || data.choices.length === 0) {
          console.error("API call failed: Response does not contain any choices.");
          // Handle this case
          // You might want to log the full response here to debug what was received
          console.log("Full response:", data);
          return null; // Or throw an error
        }
  
        // 3. Check if the first choice contains a message
        if (!data.choices[0].message) {
            console.error("API call failed: The first choice does not contain a message.");
             // Handle this case
             console.log("Full response:", data);
            return null; // Or throw an error
        }

        console.log("Full response:", data);        
        // 4.
        const contents = data.choices[0].message.content;
        if (!contents || contents.length === 0) {
          console.error("API call failed: Response does not contain any content.");
          // Handle this case
          // You might want to log the full response here to debug what was received
          console.log("Full response:", data);
          return null; // Or throw an error
        }

        console.log("Contents response:", contents);  

        const imageUrls = extractHttpLinks(contents)      
        
        console.log("Contents imageUrls:", imageUrls);  

        return imageUrls;

  } catch (error) {
      console.error('Network error calling JiMeng Image AI API:', error);
      return null;
  }
};

// 豆包的
const generateImageBySeeDreamAi = async (c, word, phonetic, example, language) => {
  console.log(`Calling SeeDream AI for word: ${word} ${example}`);

  const AI_API_KEY = c.env.SEEDREAM_API_KEY;
  const AI_API_ENDPOINT = c.env.SEEDREAM_API_ENDPOINT;
  const AI_API_MODEL = c.env.SEEDREAM_API_MODEL;

  try {
    const randomIndex = Math.floor(Math.random() * posterStyle.length);
    const style = posterStyle[randomIndex].style;

    const prompt = example && generatePosterPromptWithExample(word, language, phonetic, example, style) || generatePosterPromptWithoutExample(word, language, phonetic, style);

        const jsonData = {
          model: AI_API_MODEL,
          prompt: prompt,
          size: '1440x2560',
          response_format: "url",
          sequential_image_generation: "disabled",  // 仅需要1张图片
          stream: false,
          watermark: false
        };    

        const response = await fetch(AI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`
            },
            body: JSON.stringify(jsonData),
        });

        if (!response.ok) {
            console.error(`SeeDream AI API call failed: ${response.status} ${response.statusText}`);
            return null;
        }

        // console.log(jsonData);

        const data = await response.json(); // No type assertion needed in JS
        console.log(data);

        // 2. Check if the 'choices' array exists and is not empty
        if (!data.data || data.data.length === 0) {
          console.error("API call failed: Response does not contain any data.");
          // Handle this case
          // You might want to log the full response here to debug what was received
          console.log("Full response:", data);
          return null; // Or throw an error
        }
  
        // 3. Check if the first choice contains a message
        if (!data.data[0].url) {
            console.error("API call failed: The first choice does not contain valid url.");
             // Handle this case
             console.log("Full response:", data);
            return null; // Or throw an error
        }

        const imageUrls = [data.data[0].url];
        
        console.log("Contents imageUrls:", imageUrls);  

        return imageUrls;

  } catch (error) {
      console.error('Network error calling SeeDream Image AI API:', error);
      return null;
  }
};

// 将查看记录写入数据库
// 也可以写入缓存
const log2WordViews = async (db, userId, wordId) => {
  if (!userId || !wordId) return;

  try {
    // TODO: 如果今天已经记录过该单词，则忽略
    // const insertedWordResult = 
    await db.insert(schema.word_views).values({
        user_id: userId,
        word_id: wordId
    })
    // // Use .returning() in Drizzle for D1 to get the inserted row
    // .returning()
    // .get(); // .get() for a single row

    // // Check if insertion was successful and returned a row
    // if (!insertedWordResult) {
    //       throw new Error("Failed to insert word into views table or get inserted row.");
    // }
  } catch (error) {
      console.error('Network error insert into DB:', error);
      // return null;
  }
};

// Define navigation modes using a plain object
const NavigationMode = {
  // Represents a search operation (typically initiated by user input).
  // Corresponds to mode 0.
  Search: 0,

  // Represents navigating to the next word in a sequence.
  // Corresponds to mode 1.
  Next: 1,

  // Represents navigating to the previous word in a sequence.
  // Corresponds to mode -1.
  Previous: -1,

  // Optional: An array of valid values for easy checking
  ValidValues: [0, 1, -1]
};

word.post('/search', async (c) => {
    // Ensure the request has a JSON body
    if (!c.req.header('Content-Type')?.includes('application/json')) {
        return c.json({ message: 'Invalid Content-Type, expected application/json' }, 415);
    }

    let slug; // Removed type annotation
    // 0 表示搜索、1表示下一个、-1表示上一个
    let mode = NavigationMode.Search;
    let mustHaveImage;
    try {
       const body = await c.req.json();
       slug = body.slug;
       mode = body.mode || NavigationMode.Search;
       mustHaveImage = !!body.mhi;
    } catch (e) {
        console.error("Failed to parse request body:", e);
        return c.json({ message: 'Invalid JSON body' }, 400);
    }

    // --- Check if mode is a valid NavigationMode value ---
    // Check if the received mode is a number and is included in the valid modes
    if (typeof mode !== 'number' || !NavigationMode.ValidValues.includes(mode)) {
        console.warn(`Invalid navigation mode received: ${mode}`);
        return c.json({ message: 'Invalid navigation mode provided.' }, 400);
    }
    // --- End mode validation ---    

    // Initialize Drizzle with schema
    // The schema object needs to be imported and passed here
    const db = drizzle(c.env.DB, { schema });

    let wordData = null; // Variable to hold the final data to return, removed type annotation

    // 1. Conditional Database Query (Prefix Match or Random)
    let existingWord; // Removed type annotation

    const user = c.get('user');
    const userId = user ? user.id : null;

    // console.warn(`login user: ${ userId }`);

    // const simpleWordsFields = {
    //         id: schema.words.id,
    //         word_text: schema.words.word_text,
    //       }  

    const wordsFields = {
            id: schema.words.id,
            word_text: schema.words.word_text,
            phonetic: schema.words.phonetic,
            meaning: schema.words.meaning,
            // created_at: schema.words.created_at,
            // updated_at: schema.words.updated_at,            
          }  

    let isSlugQuoted = false;      
    let searchSlug = '';
    if (slug && typeof slug === 'string' && slug.trim() !== '') {
      const tt = slug.trim().toLowerCase()
      isSlugQuoted = isQuoted(tt)
      searchSlug = isSlugQuoted ? removeQuotes(tt) : tt
    }

    // 判断是日文还是英文
    const language = LanguageUtils.detectLanguage(searchSlug);
    const isJapanese = language === 'japanese' || language === 'mixed';

    let query;
    // Check if slug is provided and not empty
    if (searchSlug) {
        // const searchSlug = slug.trim().toLowerCase(); // Use lowercase for search
        console.log(`Performing prefix match for slug: "${searchSlug}"`);
        const prefix = searchSlug + '%';

        // Use Drizzle query builder
        // 构建初始查询
        query = db.select(wordsFields).from(schema.words);

        // 如果 mustHaveImage 为 true，则添加 INNER JOIN images 表的条件
        // INNER JOIN 会确保只有在 images 表中有匹配 word_id 的 words 记录才会被返回
        if (mustHaveImage) {
          query = query.innerJoin(schema.images, eq(schema.words.id, schema.images.word_id));
        }

        // 应用 where 条件：根据 word_text 匹配
        query = query.where(eq(schema.words.word_text, searchSlug));

        // 限制只返回一个结果
        query = query.limit(1);

        // // First try exact match for primary search
        // const result = await db.select()
        //   .from(schema.words)
        //   .where(eq(schema.words.word_text, searchSlug))
        //   .limit(1);

        // 执行最终的查询
        const result = await query;
        
        if (result.length > 0) {
             existingWord = result[0];
             console.log(`Found exact match for "${searchSlug}" - ID: ${existingWord.id}`);
        } else if (!isSlugQuoted) {
            // If no exact match, try prefix match
             console.log(`No exact match for "${searchSlug}", trying prefix match.`);
            //  let prefixResult;
            query = db.select(wordsFields).from(schema.words);
            if (mustHaveImage) {
              query = query.innerJoin(schema.images, eq(schema.words.id, schema.images.word_id));
            }

            if (userId && mode !== NavigationMode.Search) {

              query = query.leftJoin(schema.archives,
                      and(
                          eq(schema.words.id, schema.archives.word_id),
                          eq(schema.archives.user_id, userId)
                      )
                  ).where(and(
                    sql`${schema.words.word_text} LIKE ${prefix}`,
                    isNull(schema.archives.word_id)
                  )
                ); 
              // prefixResult = await db.select(wordsFields)
              //     .from(schema.words)
              //     // Use sql tag for LIKE with binding
              //     // .where(sql`${schema.words.word_text} LIKE ${prefix}`)
              //     .leftJoin(schema.archives,
              //         and(
              //             eq(schema.words.id, schema.archives.word_id),
              //             eq(schema.archives.user_id, userId)
              //         )
              //     )
              //     .where(and(
              //       sql`${schema.words.word_text} LIKE ${prefix}`,
              //       isNull(schema.archives.word_id)
              //     )) // Filter out words with a matching archive entry
              //     .limit(1); // Get the first prefix match
            } else {
              query = query.where(sql`${schema.words.word_text} LIKE ${prefix}`)
            //   prefixResult = await db.select()
            //       .from(schema.words)
            //       // Use sql tag for LIKE with binding
            //       .where(sql`${schema.words.word_text} LIKE ${prefix}`)
            //       .limit(1); // Get the first prefix match
            }

             query = query.limit(1);
             const prefixResult = await query;
             if (prefixResult.length > 0) {
                 existingWord = prefixResult[0];
                 console.log(`Found prefix match for "${searchSlug}" - ${existingWord.word_text} (ID: ${existingWord.id})`);
             } else {
                 console.log(`No word found with prefix: "${searchSlug}"`);
             }
        }

    } else {
        // Slug is empty, randomly get one word
        console.log("Slug is empty, fetching a random word.");
        // let randomResult;
        query = db.select(wordsFields).from(schema.words);
        if (mustHaveImage) {
          query = query.innerJoin(schema.images, eq(schema.words.id, schema.images.word_id));
        }        
        if (userId) {
          query = query.leftJoin(schema.archives,
                and(
                    eq(schema.words.id, schema.archives.word_id),
                    eq(schema.archives.user_id, userId)
                )
            )
            .where(isNull(schema.archives.word_id)) // Filter out words with a matching archive entry             

          // randomResult = await db.select(simpleWordsFields)
          //   .from(schema.words)
          //   .leftJoin(schema.archives,
          //       and(
          //           eq(schema.words.id, schema.archives.word_id),
          //           eq(schema.archives.user_id, userId)
          //       )
          //   )
          //   .where(isNull(schema.archives.word_id)) // Filter out words with a matching archive entry             
          //   // Use sql tag for RANDOM()
          //   .orderBy(sql`RANDOM()`)
          //   .limit(1);
        } else {
          // randomResult = await db.select(simpleWordsFields)
          //   .from(schema.words)
          //   // Use sql tag for RANDOM()
          //   .orderBy(sql`RANDOM()`)
          //   .limit(1);
        }
        query = query.orderBy(sql`RANDOM()`);
        query = query.limit(1);

        const randomResult = await query;

        if (randomResult.length > 0) {
            existingWord = randomResult[0];
            console.log(`Fetched random word: ${existingWord.word_text} (ID: ${existingWord.id})`);
        } else {
            console.log("No words found in the database.");
        }
    }

    // 2. Process Existing Word
    if (existingWord) {
        console.log(`Fetching content for existing word ID: ${existingWord.id}`);

        if (mode !== NavigationMode.Search) {

          query = db.select(wordsFields).from(schema.words);
          if (mustHaveImage) {
            query = query.innerJoin(schema.images, eq(schema.words.id, schema.images.word_id));
          }

          if (userId) {
            query = query.leftJoin(schema.archives,
                and(
                    eq(schema.words.id, schema.archives.word_id),
                    eq(schema.archives.user_id, userId)
                )
            )
            .where(and(
              mode === NavigationMode.Next ? gt(schema.words.id, existingWord.id) : lt(schema.words.id, existingWord.id),
              isNull(schema.archives.word_id)
            )) // Filter out words with a matching archive entry
            // .orderBy(mode === NavigationMode.Next ? asc(schema.words.id) : desc(schema.words.id))

            // nextResult = await db.select(wordsFields)
            // .from(schema.words)
            // // .where(mode === NavigationMode.Next ? gt(schema.words.id, existingWord.id) : lt(schema.words.id, existingWord.id))
            // .leftJoin(schema.archives,
            //     and(
            //         eq(schema.words.id, schema.archives.word_id),
            //         eq(schema.archives.user_id, userId)
            //     )
            // )
            // .where(and(
            //   mode === NavigationMode.Next ? gt(schema.words.id, existingWord.id) : lt(schema.words.id, existingWord.id),
            //   isNull(schema.archives.word_id)
            // )) // Filter out words with a matching archive entry
            // .orderBy(mode === NavigationMode.Next ? asc(schema.words.id) : desc(schema.words.id))
            // .limit(1);
          } else {
            // nextResult = await db.select()
            // .from(schema.words)
            // .where(mode === NavigationMode.Next ? gt(schema.words.id, existingWord.id) : lt(schema.words.id, existingWord.id))
            // .orderBy(mode === NavigationMode.Next ? sql`id ASC` : sql`id DESC`)
            // .limit(1);
            query = query.where(mode === NavigationMode.Next ? gt(schema.words.id, existingWord.id) : lt(schema.words.id, existingWord.id))
            // .orderBy(mode === NavigationMode.Next ? asc(schema.words.id) : desc(schema.words.id))
            // .orderBy(mode === NavigationMode.Next ? sql`id ASC` : sql`id DESC`)
          }

          query = query.orderBy(mode === NavigationMode.Next ? asc(schema.words.id) : desc(schema.words.id));
          query = query.limit(1);

          const nextResult = await query;

          if (nextResult.length > 0) {
              existingWord = nextResult[0];
              console.log(`Fetching content for next word ID1: ${existingWord.id}`);
          } else {
              console.log(`Fetching content for next word ID2: ${existingWord.id}`);
          }
        }

        // Fetch related content from word_content table
        const contentRecords = await db.select()
            .from(schema.word_content)
            .where(eq(schema.word_content.word_id, existingWord.id));

        const imageRecords = await db.select()
            .from(schema.images)
            .where(eq(schema.images.word_id, existingWord.id));

        // Format the data for the frontend response
        wordData = formatDbResultToWordResponse(c, existingWord, contentRecords, imageRecords);

        log2WordViews(db, userId, existingWord.id);

        // Return the found word data
        console.log("Returning existing word data.");
        return c.json(wordData, 200);

    } else {
      if (mode !== NavigationMode.Search || mustHaveImage) {
        console.log("No more word data.");
        return c.json({}, 200);
      }

      // 3. Process New Word (If Not Found) - Call AI and Insert
      console.log(`Word "${searchSlug}" not found in DB. Calling AI.`);

      // Ensure slug is available for AI call (should be if existingWord is null from prefix search)
      if (!searchSlug) {
        // This case should ideally not happen if the slug was empty initially
        // and no random word was found, but handle defensively.
        return c.json({ message: 'Cannot generate data for empty slug.' }, 400);
      }

      // 限流检查
      let hasFreeQuota = false;
      // --- 2. 检查和消费免费额度 ---
      try {
          hasFreeQuota = await checkAndConsumeFreeQuota(c, userId);
      } catch (error) {
        console.error(error.message);
        // checkAndConsumeFreeQuota 内部已经抛出了 HTTPException
        return c.json({ message: error.message }, 400);
      }

      const wordToGenerate = searchSlug;

      // Call Gemini AI to generate data
      let aiResponse = await generateBentoByAi(c, userId, wordToGenerate, isJapanese, hasFreeQuota);
      if (!aiResponse || !aiResponse[wordToGenerate]) {
          console.error(`AI failed to generate data for "${wordToGenerate}" or returned unexpected format.`);
          if (typeof aiResponse === 'string') {
            // 说明没有配置ai 
            return c.json({ message: '请在个人中心配置AI大模型接入信息以继续使用。' }, 500);
          } else {
            return c.json({ message: `Failed to generate data for "${wordToGenerate}".` }, 500);
          }
      }

      const geminiData = aiResponse[wordToGenerate];
      console.log("AI data received, inserting into DB.");

      let newWord;
      // Start a database transaction for inserting into multiple tables
      try {
            // Insert into words table
            // Assuming associating with 'public' user (id=0) for simplicity
            // In a real app, use the authenticated user's ID
            const insertedWordResult = await db.insert(schema.words).values({
                user_id: 0, // Associate with public user ID 0
                word_text: wordToGenerate,
                phonetic: geminiData.phonetic || null, // Use phonetic from AI, allow null
                meaning: geminiData.meaning || null,
                // createdAt and updatedAt will default
            })
            // Use .returning() in Drizzle for D1 to get the inserted row
            .returning()
            .get(); // .get() for a single row

            // Check if insertion was successful and returned a row
            if (!insertedWordResult) {
                  throw new Error("Failed to insert word into words table or get inserted row.");
            }
            newWord = insertedWordResult; // Use the result

            // Map AI content to word_content records
            const contentRecordsToInsert = mapGeminiToDbContent(newWord.id, geminiData);

            // Insert into word_content table in batches if necessary (D1 limits batch size)
            // For simplicity, inserting all at once here. Consider batching for many records.
            if (contentRecordsToInsert.length > 0) {
                  // Drizzle insert returns an object with 'changes' or similar, not the inserted rows for batch
                  await db.insert(schema.word_content).values(contentRecordsToInsert);
            }

          // Transaction successful, format the data to return to frontend
          // Need to re-fetch content records after insertion if you didn't get them back from insert
          const newlyInsertedContent = await db.select()
                .from(schema.word_content)
                .where(eq(schema.word_content.word_id, newWord.id));

          wordData = formatDbResultToWordResponse(c, newWord, newlyInsertedContent);

          log2WordViews(db, userId, newWord.id);

          console.log(`Word "${wordToGenerate}" and content inserted successfully.`);
          // Return the newly created word data with 201 status
          return c.json(wordData, 201);

      } catch (dbError) { // Removed type annotation
        // 基础信息成功，明细部分失败的时候，需要把残余信息删除
        if (newWord) {
          try {
            await db.delete(schema.words).where(eq(schema.words.id, newWord.id));
          } catch (dbError2) {
            console.error(`Database transaction failed for delete word head "${wordToGenerate}":`, dbError2);
          }
        }
          console.error(`Database transaction failed for word "${wordToGenerate}":`, dbError);
          // Rollback is automatic on error with db.transaction
          return c.json({ message: `Failed to save generated data for "${wordToGenerate}".` }, 200);
      }
    }
});

// /**
//  * Converts a Base64 encoded string to a Blob object using the Fetch API.
//  * This method is generally more performant for larger data in modern browsers.
//  * Designed to run in a browser environment.
//  *
//  * @param {string} base64String - The Base64 encoded string (e.g., from Gemini API inlineData.data).
//  * @param {string} mimeType - The MIME type of the image (e.g., 'image/png', 'image/jpeg').
//  * @returns {Promise<Blob | null>} A Promise that resolves with a Blob object representing the image data, or null if conversion fails.
//  */
// async function base64ToBlob(base64String, mimeType) {
//   // Ensure inputs are valid
//   if (typeof base64String !== 'string' || !mimeType || typeof mimeType !== 'string') {
//       console.error("Invalid input: base64String or mimeType is missing or not a string.");
//       return null;
//   }

//   // Construct a Data URL from the base64 string and mime type
//   const dataUrl = `data:${mimeType};base64,${base64String}`;
//   console.log("Constructed Data URL:", dataUrl.substring(0, 50) + '...'); // Log a snippet

//   try {
//       // Use the Fetch API to fetch the Data URL
//       // The browser handles the decoding of the base64 data internally
//       const response = await fetch(dataUrl);

//       // Check if the fetch was successful
//       if (!response.ok) {
//           console.error(`Fetch failed with status ${response.status}: ${response.statusText}`);
//           return null; // Return null on fetch failure
//       }

//       // Get the Blob object from the response
//       const blob = await response.blob();
//       console.log(`Created Blob object (size: ${blob.size}, type: ${blob.type}) using Fetch API.`);

//       return blob; // Return the created Blob object

//   } catch (error) {
//       console.error("Error converting base64 string to Blob using Fetch API:", error);
//       // Handle potential errors during fetch
//       return null; // Return null on failure
//   }
// }

// 创建单词关联的图片
word.post('/imagize', async (c) => {
  // Ensure the request has a JSON body
  if (!c.req.header('Content-Type')?.includes('application/json')) {
      return c.json({ message: 'Invalid Content-Type, expected application/json' }, 415);
  }

  const user = c.get('user');
  const userId = user ? user.id : null;

  let slug;
  let example;
  let force = false;  // 是否强制重新生成
  try {
     const body = await c.req.json();
     slug = body.slug;
     example = body.example || '';
     force = body.force;
  } catch (e) {
      console.error("Failed to parse request body:", e);
      return c.json({ message: 'Invalid JSON body' }, 400);
  }

  // Initialize Drizzle with schema
  // The schema object needs to be imported and passed here
  const db = drizzle(c.env.DB, { schema });

  // 1. Conditional Database Query (Prefix Match or Random)
  let existingWord; // Removed type annotation

  // Check if slug is provided and not empty
  if (slug && typeof slug === 'string' && slug.trim() !== '') {
      const searchSlug = slug.trim().toLowerCase(); // Use lowercase for search
      console.log(`Performing match for slug: "${searchSlug}"`);

      // Use Drizzle query builder
      // First try exact match for primary search
      const result = await db.select()
        .from(schema.words)
        .where(eq(schema.words.word_text, searchSlug))
        .limit(1);

      if (result.length > 0) {
           existingWord = result[0];
           console.log(`Found exact match for "${searchSlug}" - ID: ${existingWord.id}`);

           const images = await db.select()
           .from(schema.images)
           .where(eq(schema.images.word_id, existingWord.id));
          //  .limit(1);
          // 如果图片是http开头，默认已经失效（即梦的图片），客户端会出现生成图片的按钮
          if (images && images.length > 0 && images.filter(img => img.image_key.startsWith('http')).length == 0) {
            // const imageUrls = images.map(img => img.image_key.startsWith('http') && img.image_key || `${c.env.VITE_BASE_URL}/api/word/image/${img.image_key}`)
            const imageUrls = images.map(img => `${c.env.VITE_BASE_URL}/api/word/image/${img.image_key}`)

            return c.json({imageUrls: imageUrls}, 200);
          }
    
      } else {
        // If no exact match, try prefix match
        console.log(`No word found with prefix: "${searchSlug}"`);
      }

  }

  // 2. Process Existing Word
  if (!existingWord) {
      // Return the found word data
      console.error(`No word found with prefix: "${slug}"`);
      return c.json({}, 200);
  } else {
    if (!example) {
      console.error(`No example provided, try to grab one from db: "${slug}"`);
      // 从数据库中获取第一个例句
      const examples = await db.select({
        content: schema.word_content.content,
      })
      .from(schema.word_content)
      .where(
        and(
          eq(schema.word_content.language_code, "en"),
          eq(schema.word_content.content_type, "examples"),
          eq(schema.word_content.word_id, existingWord.id))
        )
      .limit(1);
      if (examples.length > 0) {
        try {
          console.error(`Examples from db: "${examples[0].content}"`);
          const jsonExamples = JSON.parse(examples[0].content);
          // 是一个数组
          example = jsonExamples[0];
        } catch (error) {
          console.error(`Error grabing examples from db: ${slug}`, error);
        }
      }
    }
  } 

  // // Ensure slug is available for AI call (should be if existingWord is null from prefix search)
  // if (!slug || typeof slug !== 'string' || slug.trim() === '') {
  //       // This case should ideally not happen if the slug was empty initially
  //       // and no random word was found, but handle defensively.
  //       return c.json({ message: 'Cannot generate data for empty slug.' }, 400);
  // }
  const wordToGenerate = slug.trim().toLowerCase();
  const phonetic = existingWord.phonetic;
  const exampleToGenerate = example.trim();

  // 判断是日文还是英文
  const language = LanguageUtils.detectLanguage(wordToGenerate);
  // const isJapanese = language === 'japanese' || language === 'mixed';  

  // 限流检查
  let hasFreeQuota = false;
  // --- 2. 检查和消费免费额度 ---
  try {
      hasFreeQuota = await checkAndConsumeFreeQuota(c, userId);
  } catch (error) {
    console.error(error.message);
    // checkAndConsumeFreeQuota 内部已经抛出了 HTTPException
    return c.json({ message: error.message }, 400);
  }  

  let imageUrls = await generateImageByAi(c, userId, wordToGenerate, phonetic, exampleToGenerate, language, hasFreeQuota);
  // let imageUrls = await generateImageByDreaminaAi(c, wordToGenerate, phonetic, exampleToGenerate, language);

  // console.log(imageUrls);

  // const imageUrls = ['https://p3-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/c0efd5fd4a414fbaab1232df5e876d6b~tplv-tb4s082cfz-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1749600000&x-signature=sGXKNhKHkj%2F2msIbhAQtcLlGNXk%3D&format=.jpeg', 
  //   'https://p9-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/3bc050392177442ebed27dc883891b7a~tplv-tb4s082cfz-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1749600000&x-signature=uipvjRhc40XXAMDhIBEeO%2BEuit4%3D&format=.jpeg', 
  //   'https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/76b4331521494f5780d04c7682615124~tplv-tb4s082cfz-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1749600000&x-signature=Gnv%2Fp1XoAo5WqBYUWjIc%2BzoWHTQ%3D&format=.jpeg', 
  //   'https://p9-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/4b7a4ad7e2cb4e11bc1ff38ab4d23da8~tplv-tb4s082cfz-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1749600000&x-signature=UJ8O08ado9UGzoi%2FLya%2FXR4CPRk%3D&format=.jpeg']

  let mimeType = 'image/jpeg';  // 即梦默认生成jpeg图片
  let allImageResults = [];
  if (imageUrls && imageUrls.length > 0) {
    console.log('开始加载图片...');
    allImageResults = await readImageBinaryStreams(imageUrls);
    console.log('所有图片加载结果:', allImageResults.length);
  }

  // 去掉gemini生图，质量不好
  // if (!allImageResults || allImageResults.length == 0) {
  //   const inlineData = await generateImageByGeminiAi(c, wordToGenerate);

  //   if (!inlineData) {
  //     console.error(`AI failed to generate image for "${wordToGenerate}" or returned unexpected format.`);
  //     return c.json({ message: `Failed to generate image for "${wordToGenerate}".` }, 500);
  //   }

  //   mimeType = inlineData.mimeType || 'application/octet-stream';
  //   // Convert the base64 string to a Uint8Array
  //   // Buffer.from() works in Cloudflare Workers and returns a Uint8Array
  //   let imageBinaryData;
  //   try {
  //       imageBinaryData = Buffer.from(inlineData.data, "base64");
  //       console.log(`Converted base64 image data to Uint8Array of size: ${imageBinaryData.byteLength} bytes`);
  //       allImageResults.push({ url: '', data: imageBinaryData }); // 成功时返回数据
  //   } catch (e) {
  //       console.error("Failed to convert base64 string to binary data:", e);
  //       // return null; // Or throw an error
  //       return c.json({ message: `Failed to generate binary image for "${wordToGenerate}".` }, 500);
  //   }
  // }
  if (!allImageResults || allImageResults.length == 0) {
    return c.json({ message: `Failed to generate image for "${wordToGenerate}".` }, 500);
  }

    console.log(`AI image received, inserting into R2. ${mimeType}`);

    // 删除所有图片
    try {
      await db.delete(schema.images).where(eq(schema.images.word_id, existingWord.id));
    } catch (dbError) {
      console.error(`Database transaction failed for delete images "${existingWord.word_text}":`, dbError);
    }

    // 2025/12/11 不保存成功下载到本地的数据
    const allResultsPromises = allImageResults.filter(img => !!img.data).map(async (imageBinaryData) => {
      // Start a database transaction for inserting into multiple tables
      try {
        // // 保存到本地失败了，直接存入url（其实没有意义，即梦这个URL会失效）
        // if (!imageBinaryData.data && imageBinaryData.url) {
        //   const insertedImageResult = await db.insert(schema.images).values({
        //     word_id: existingWord.id, // Associate with public user ID 0
        //     image_key: imageBinaryData.url,
        //     prompt: exampleToGenerate
        //     })
        //     // Use .returning() in Drizzle for D1 to get the inserted row
        //     .returning()
        //     .get(); // .get() for a single row

        //   // Check if insertion was successful and returned a row
        //   if (!insertedImageResult) {
        //     throw new Error("Failed to insert image into table or get inserted row.");
        //   }

        //   return imageBinaryData.url;
        // }

        const objectKey = nanoid(10);
        const objectPath = `${objectKey}.jpeg`
        // const imageMimeType = 'image/png';
        // Upload the binary data to R2
        // The put method takes the object key, the data, and optional options like contentType
        const r2Object = await c.env.WORDBENTO_R2.put(objectPath, imageBinaryData.data, {
          contentType: mimeType //|| 'application/octet-stream', // Set the MIME type
          // Add other options here if needed, e.g., customMetadata, httpMetadata
          // httpMetadata: {
          //     cacheControl: 'max-age=31536000', // Example: Cache for 1 year
          // },
        });

        let r2ObjectKey;
        if (r2Object) {
            console.log(`Image stored successfully in R2 with key: ${r2Object.key}`);
            // Return the key of the stored object
            r2ObjectKey = r2Object.key;
        } else {
            console.error("Failed to upload image to R2.");
            //  return c.json({ message: `Failed to upload image for "${wordToGenerate}".` }, 500);
            throw new Error("Failed to upload image to R2.");
        }      
          // Insert into words table
          // Assuming associating with 'public' user (id=0) for simplicity
          // In a real app, use the authenticated user's ID
          const insertedImageResult = await db.insert(schema.images).values({
              word_id: existingWord.id, // Associate with public user ID 0
              image_key: r2ObjectKey,
              prompt: exampleToGenerate
          })
          // Use .returning() in Drizzle for D1 to get the inserted row
          .returning()
          .get(); // .get() for a single row

          // Check if insertion was successful and returned a row
          if (!insertedImageResult) {
            throw new Error("Failed to insert image into table or get inserted row.");
          }

        console.log(`Word "${wordToGenerate}" and image inserted successfully.`);
        // return c.json({'key': r2ObjectKey}, 200);
        // return c.json({imageUrls: [`${c.env.VITE_BASE_URL}/api/word/image/${r2ObjectKey}`]}, 200);
        // return c.json({inlines: [inlineData]}, 200);
        return `${c.env.VITE_BASE_URL}/api/word/image/${r2ObjectKey}`

      } catch (dbError) { // Removed type annotation
          console.error(`Database transaction failed for word "${wordToGenerate}":`, dbError);
          // Rollback is automatic on error with db.transaction
          // return c.json({ message: `Failed to save generated image for "${wordToGenerate}".` }, 500);
          return null;
      }
    });

  // Promise.all 会等待所有 Promise 完成，无论它们是成功还是解析为包含错误的对象
  const results = await Promise.all(allResultsPromises);
  const savedImageUrls = results.filter(data => data !== null);

  if (savedImageUrls && savedImageUrls.length > 0) {
    return c.json({imageUrls: savedImageUrls}, 200);
  } else {
    return c.json({ message: `Failed to save generated image for "${wordToGenerate}".` }, 500);
  }
});

// 获取单词关联的图片
word.get('/image/:key', async (c) => {
  // // Ensure the request has a JSON body
  // if (!c.req.header('Content-Type')?.includes('application/json')) {
  //     return c.json({ message: 'Invalid Content-Type, expected application/json' }, 415);
  // }

  console.log('Attempting to retrieve image from local R2');

  const objectKey = c.req.param('key');
  // If objectKey is empty, it's a bad request
  if (!objectKey) {
    return new Response('Bad Request: Missing object key.', { status: 400 });
  }  

  console.log(`Attempting to retrieve image from local R2 with key: "${objectKey}"`);

  try {
    // Get the object from the R2 bucket
    const object = await c.env.WORDBENTO_R2.get(objectKey);

    // Check if the object exists
    if (object === null) {
      console.warn(`Image not found in local R2: "${objectKey}"`);
      return new Response('Not Found', { status: 404 });
    }

    console.log(`Successfully retrieved image "${object.httpMetadata}" from local R2.`);

    // Return the image data with the correct content type
    // We clone the headers to avoid modifying the original object headers
    const headers = new Headers(object.httpMetadata);
    headers.set('ETag', object.etag); // Include ETag for caching

    // Add CORS headers if your frontend is on a different origin during local development
    headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins for local testing
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*'); // Allow all headers

    return new Response(object.body, {
      status: 200, // HTTP status code 200 OK
      headers: headers,
    });

  } catch (error) {
    console.error(`Error retrieving image "${objectKey}" from local R2:`, error);
    return new Response('Internal Server Error: Failed to retrieve image.', { status: 500 });
  }
});

// --- Mark Word as Mastered Route (Existing) ---
word.put('/master/:id', async (c) => {
  // ... (existing mark as mastered logic)
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
  }

  const idParam = c.req.param('id');
  const wordId = parseInt(idParam, 10);

  if (isNaN(wordId) || wordId <= 0) {
    return c.json({ message: 'Invalid word ID provided.' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });

  try {
    // let existingUser;
    // const usersResult = await db.select()
    //   .from(schema.users)
    //   .where(eq(schema.users.uuid, user.uuid));

    // if (usersResult.length > 0) {
    //   existingUser = usersResult[0];
    // } else {
    //   return c.json({ message: 'User not found.' }, 404);      
    // }

    let existingWord;
    const wordsResult = await db.select()
      .from(schema.words)
      .where(eq(schema.words.id, wordId));

    if (wordsResult.length > 0) {
      existingWord = wordsResult[0];
    } else {
      return c.json({ message: 'Word not found.' }, 404);      
    }

    console.log(`Word ID ${wordId} exists111111.`);

    const archivesResult = await db.select()
      .from(schema.archives)
      .where(and(eq(schema.archives.user_id, user.id), eq(schema.archives.word_id, wordId)));

    if (archivesResult.length > 0) {
      return c.json({ message: 'Word has been achived already.' }, 200);
    }

    console.log(`Word ID ${wordId} exists22222.`);

    // TODO： user.id 不存在
    const insertedResult = await db.insert(schema.archives).values({
        user_id: user.id, // Associate with public user ID 0
        word_id: wordId,
        // createdAt and updatedAt will default
    })
    // Use .returning() in Drizzle for D1 to get the inserted row
    .returning()
    .get(); // .get() for a single row

    // Check if insertion was successful and returned a row
    if (!insertedResult) {
      console.warn(`Attempted to mark non-existent word ID ${wordId} as mastered.`);
      return c.json({ message: 'Word not found or already mastered.' }, 404);
    }

    console.log(`Word ID ${wordId} marked as mastered.`);
    return c.json({ message: 'Word marked as mastered successfully.' }, 200);

  } catch (error) {
    console.error(`Error marking word ID ${wordId} as mastered:`, error);
    return c.json({ message: 'Failed to mark word as mastered.' }, 500);
  }
});

// 创建单词关联的音频
word.post('/tts', async (c) => {
  // Ensure the request has a JSON body
  if (!c.req.header('Content-Type')?.includes('application/json')) {
      return c.json({ message: 'Invalid Content-Type, expected application/json' }, 415);
  }

  let text;
  let example;
  let voice;
  let rate;
  let volume;
  let pitch;
  try {
     const body = await c.req.json();
     text = body.text;
     example = body.example;
     voice = body.voice || 'en-US-AriaNeural';
     rate = body.rate || '0';
     volume = body.volume || '0';
     pitch = body.pitch || '0';
  } catch (e) {
      console.error("Failed to parse request body:", e);
      return c.json({ message: 'Invalid JSON body' }, 400);
      // return c.text('Invalid JSON body', 500);
  }

  console.log(`voice text== ${text}`)

  // Check if slug is provided and not empty
  if (text && typeof text === 'string' && text.trim() !== '') {
      const textToGenerate = `${text}, ${text}, ${example || text}`
        const externalTtsResponse = await fetch('https://edge-tts.dayax.net/api/api.php?action=synthesize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'origin': 'https://edge-tts.dayax.net'
                // If the external TTS service requires an API key, add it here from your Worker's environment variables:
                // 'x-api-key': c.env.EXTERNAL_TTS_API_KEY, // Example
                // 'Authorization': `Bearer ${c.env.EXTERNAL_TTS_API_KEY}`, // Another example
            },
            body: JSON.stringify({ text: textToGenerate, voice, rate, volume, pitch }),
        });

        if (!externalTtsResponse.ok) {
            const errorText = await externalTtsResponse.text();
            console.error(`External TTS service error: ${externalTtsResponse.status} - ${errorText}`);
            // Forward the external service's error status and message to the frontend
            return c.json({ message: `External TTS service error: ${errorText}` }, externalTtsResponse.status);
        }

        const externalTtsJson = await externalTtsResponse.json();

        // Assuming externalTtsJson has the format {"base64Audio": "..."}
        if (!externalTtsJson.base64Audio) {
            throw new Error("External TTS service did not return base64Audio.");
        }

        // Return the base64 audio directly to the frontend
        return c.json({ base64Audio: externalTtsJson.base64Audio }, 200);        
      //   c.header('Content-Type', 'audio/mpeg');
      // // return c.body(audioBuffer);        
      //   return c.body(rawAudioBuffer)

        // --- How to use the raw audio buffer (example for Node.js) ---
        // You could save it to a file:
        // const fs = require('fs');
        // fs.writeFileSync('output_raw.mp3', Buffer.from(rawAudioBuffer));
        // console.log("Raw audio buffer saved to output_raw.mp3");

        // Or if you were sending this to a client (e.g., via a web server):
        // res.setHeader('Content-Type', 'audio/mpeg'); // Or 'audio/wav' depending on format
        // res.send(Buffer.from(rawAudioBuffer));
    
  } else {
    // If no exact match, try prefix match
    console.log(`No word found with prefix: "${searchSlug}"`);
    // return c.text('Error retrieving audio', 500);
    return c.json({ message: 'Internal Server Error during TTS proxy' }, 500);
  }

});

// 今日单词
word.post('/today', async (c) => {
  const user = c.get('user');
  if (!user) {
    // return c.json([], 200); // Return 200 OK for existing
    return c.json({ message: 'Forbidden' }, 403);
  }

  let maxViewsId = 0;
  try {
     const body = await c.req.json();
     maxViewsId = body.maxId;
  } catch (e) {
      console.error("Failed to parse request body:", e);
      return c.json({ message: 'Invalid JSON body' }, 400);
  }

  console.log('maxViewsId =>', maxViewsId);

  const db = drizzle(c.env.DB, { schema });
  
  // 1. 在 JS 中获取当天的起始和结束时间（可以控制时区）
  const start = new Date();
  start.setDate(start.getDate() - 1); // 减去一天
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  // 2. 关键修改：转换为 ISO 字符串 (D1 只能读懂字符串)
  // 注意：toISOString() 会转换为 UTC 时间，这通常是数据库存储的标准
  // const startStr = start.toISOString(); 
  // const endStr = end.toISOString();
  // 2. 转换为数据库能理解的 UTC 字符串格式
  // 结果示例: startStr = "2025-11-19 16:00:00", endStr = "2025-11-20 15:59:59"
  const startStr = toSqliteUtcString(start);
  const endStr = toSqliteUtcString(end);  

  console.log('startStr - endStr', startStr, endStr);

  try {
    // 1.1. 获取总记录数
    const existsWordViews = await db.select({
      id: schema.word_views.id,
      word_id: schema.word_views.word_id,
    })
    .from(schema.word_views)
    .where(and(
      eq(schema.word_views.user_id, user.id),  
      gt(schema.word_views.id, parseInt(maxViewsId)),
      // 使用 gte (大于等于) 和 lte (小于等于)
      // 这里传入字符串，而不是 Date 对象
      gte(schema.word_views.created_at, startStr),
      lte(schema.word_views.created_at, endStr)
    ))
    .limit(50);

    const existsIds = existsWordViews.map(d => d.word_id)
    const uniqueExistsIds = [...new Set(existsIds)];

    const totalCount = uniqueExistsIds.length;
    if (totalCount === 0) {
      return c.json({
        data: [],
        totalCount: 0
      }, 200);
    }

    const allViewsIds = existsWordViews.map(view => view.id);
    // 最近的views的id
    const latestViewsId = Math.max(...allViewsIds);
        
    const paginatedWords = await db.select({
      id: schema.words.id,
      word_text: schema.words.word_text,
      phonetic: schema.words.phonetic,
      meaning: schema.words.meaning,
    })
    .from(schema.words)
    .where(inArray(schema.words.id, uniqueExistsIds));
    // .orderBy(desc(schema.words.id));

    let successfulWords = [];
    if (paginatedWords.length > 0) {

      // TODO: 放入缓存优化
      const results = await Promise.allSettled(paginatedWords.map(async (existingWord) => {
          // 并行获取相关内容和图片记录
          const [contentRecords, imageRecords] = await Promise.all([
              db.select()
                  .from(schema.word_content)
                  .where(eq(schema.word_content.word_id, existingWord.id)),
              db.select()
                  .from(schema.images)
                  .where(eq(schema.images.word_id, existingWord.id))
          ]);

          let newWord = formatDbResultToWordResponse(c, existingWord, contentRecords, imageRecords);
          newWord.word = newWord.word_text;
          let etymology = ''
          if (newWord.content && newWord.content.etymology && newWord.content.etymology.en) {
            etymology = `\n\n${newWord.content.etymology.en}`
          }
          // let examples = ''
          // if (newWord.content && newWord.content.examples && newWord.content.examples.en) {
          //   examples = "\n\n__LLM_RESPONSE__ [" + newWord.content.examples.en.join(",") + "]"
          // }
          let examples = ''
          if (newWord.content && newWord.content.examples && newWord.content.examples.en) {
            examples = "\n\n----\n\n" + newWord.content.examples.en.join("\n\n")
          }
          // let affixes = ''
          // if (newWord.content && newWord.content.affixes && newWord.content.affixes.zh) {
          //   affixes = "\n\n----\n\n" + newWord.content.affixes.zh
          // }

          // newWord.text = `${newWord.word}\n${newWord.phonetic}, ${newWord.meaning}`;
          newWord.text = `${newWord.word}\n\n${newWord.phonetic}${etymology}${examples}`;
          return newWord;
      }));

      successfulWords = results
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value);      

      // const paginatedImages = await db.select({
      //   word_id: schema.images.word_id,
      //   image_key: schema.images.image_key
      // })
      // .from(schema.images)
      // .where(inArray(schema.images.word_id, existsIds));


            
      // // 使用reduce转换为目标格式
      // const wordImages = paginatedImages.reduce((acc, item) => {
      //     const { word_id, image_key } = item;
          
      //     if (!acc[word_id]) {
      //         acc[word_id] = [];
      //     }
          
      //     if (image_key) {
      //         acc[word_id].push(image_key);
      //     }
          
      //     return acc;
      // }, {});

      // paginatedWords.forEach(r => {
      //     r.imageUrls = wordImages[r.id] || []
      // });
      console.log(`Today words found with length: ${paginatedWords.length}`);
    }

    // 返回分页数据和总记录数
    return c.json({
      data: successfulWords,
      latestViewsId: latestViewsId,
      totalCount: totalCount
    }, 200);    

  } catch (checkError) {
      console.error("Failed to check for today words in DB:", checkError);
      return c.json({ message: 'Failed to get today words.' }, 500);
  }

});


export default word;
