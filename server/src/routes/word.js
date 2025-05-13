import { Hono } from 'hono';
// Import necessary Drizzle functions. 'eq' and 'sql' are commonly used.
// Adjust imports based on your Drizzle setup if needed.
// Note: Drizzle ORM can be used with JavaScript, but type safety is lost.
// The 'schema' import is not needed in the JS runtime code itself,
// but the Drizzle client needs to be configured with the schema definition.
// Assuming your Drizzle client is configured elsewhere with the schema.
// For D1 with Drizzle, you typically initialize it like drizzle(env.DB, { schema });
// We'll keep the drizzle import and schema reference in the initialization.
import { and, eq, gt, lt, isNull, asc, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
// The schema object itself is usually defined in a separate file and imported for drizzle initialization
import * as schema from '../db/schema'; // Keep schema import for drizzle initialization
import { sql } from 'drizzle-orm'; // Import sql tag for raw SQL fragments like RANDOM() and LIKE
import { nanoid } from "nanoid";
import { jsonrepair } from 'jsonrepair';

// Type definitions are removed in JavaScript

const word = new Hono();

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
            const icon = content['icon'];

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


// Placeholder function to call Gemini AI API
// Replace with your actual API call logic
// Type annotations removed
const generateBentoByGeminiAi = async (c, word) => {
    console.log(`Calling Gemini AI for word: ${word}`);
    // This is a placeholder. You need to replace this with your actual API call.
    // Example using fetch:
    
    const GEMINI_API_ENDPOINT = c.env.GEMINI_API_ENDPOINT
    const GEMINI_API_KEY = c.env.GEMINI_API_KEY
    const GEMINI_API_MODEL = c.env.GEMINI_API_MODEL

    try {
      const prompt = `
我给你一个单词，请从下列9个角度，返回json格式的数据。每个角度都要包含中文+英文，并根据该角度内容的含义，从"lucide-react"库中动态匹配上相应的图标。举例：热点故事跟关税相关的话，需要展示一个海关的图标：
1、该单词的美式音标。json的键为"phonetic"
2、该单词的简洁的中文含义，作为副标题。json的键为"meaning"
2、词义解释。json的键为"definition"
3、3个例句。json的键为"examples"
4、词源分析。json的键为"etymology"
5、词缀分析。json的键为"affixes"
6、发展历史和文化背景。json的键为"history"
7、单词变形，json的键为"forms"
8、记忆辅助，在两种思路种选择一种即可：a. 无厘头的笑话或者小故事，增强记忆；b.将单词拆解成字母，每个字母组合成新单词，最后组合成一句话，这句话要跟该单词有关联。json的键为"memory_aid"
9、热点故事，结合当下热点，写一个针对该单词的小故事，中文+英文。json的键为"trending_story"。

举例，单词是"hurl"时，返回内容如下：

{
	"hurl": {
    phonetic: "/hɜːrl/",
    meaning: "投掷、猛力抛出",
    definition: {
      icon: "BookOpen",    
      en: "To throw or fling with great force, often in an aggressive manner. Can also refer to forcefully expressing harsh words or insults.",
      zh: "用很大力气猛烈地抛、掷、扔；也可指激烈地表达尖锐的批评或侮辱性言论。"
    },
    examples: {
      icon: "FileText",    
      en: [
        "The pitcher can hurl the baseball at over 95 miles per hour.",
        "Protesters hurled stones at the police barricade.",
        "The critic hurled accusations of plagiarism at the author."
      ],
      zh: [
        "这位投手能以超过95英里每小时的速度投掷棒球。",
        "抗议者向警方设置的路障投掷石块。",
        "评论家对作者提出了抄袭的指控。"
      ]
    },
    etymology: {
      icon: "Atom",    
      en: "The word 'hurl' comes from Middle English 'hurlen', which means 'to rush, dash against.' It's likely related to Old Norse 'hurra' meaning 'to whir or spin' and possibly connected to Low German 'hurreln' meaning 'to throw or hurl'.",
      zh: "单词'hurl'来源于中古英语'hurlen'，意为'冲、猛撞'。它可能与古挪威语'hurra'(意为'呼啸或旋转')相关，也可能与低地德语'hurreln'(意为'抛或掷')有联系。"
    },
    affixes: {
      icon: "Layers",
      en: "The word 'hurl' is a base word without prefixes or suffixes. Related forms include: hurler (noun, person who hurls), hurling (gerund/present participle), hurled (past tense).",
      zh: "'hurl'是一个没有前缀或后缀的基本词。相关形式包括：hurler（名词，投掷者），hurling（动名词/现在分词），hurled（过去式）。"
    },
    history: {
      icon: "History",
      en: "The concept of 'hurling' has been fundamental to human development, from primitive hunting techniques to warfare. In sports, hurling is also the name of an ancient Irish game dating back over 3,000 years, considered one of the world's oldest field games, where players use sticks (hurleys) to hit a small ball.",
      zh: "'投掷'的概念对人类发展至关重要，从原始狩猎技术到战争都离不开它。在体育领域，'hurling'也是一种有着3000多年历史的爱尔兰古老运动的名称，被认为是世界上最古老的场地运动之一，运动员使用木棍（hurleys）击打小球。"
    },
    forms: {
      icon: "ArrowUpDown",
      en: "Present: hurl, hurls\nPast: hurled\nPast participle: hurled\nPresent participle: hurling\nNouns: hurler (person), hurl (the act)",
      zh: "现在式：hurl, hurls\n过去式：hurled\n过去分词：hurled\n现在分词：hurling\n名词：hurler（投掷者），hurl（投掷行为）"
    },
    memory_aid: {
      icon: "Lightbulb",
      en: "Think of 'hurl' as 'H-U-Really Launch' something. The 'H' stands for 'high' and 'U' for 'up' - when you hurl something, you're really launching it high up with force!",
      zh: "将'hurl'想象成'H-U-Really Launch'（真正发射）。'H'代表'high'（高），'U'代表'up'（向上）——当你hurl某物时，你是真的在用力将它高高发射出去！"
    },
    trending_story: {
      icon: "Newspaper",
      en: "In recent Olympic discussions, analysts noted how social media has transformed the way we perceive sports like javelin throwing. \"Athletes no longer just hurl spears for distance,\" commented sports psychologist Dr. Mei Zhang. \"They hurl themselves into viral fame with every throw.\" This phenomenon highlights how traditional feats of strength now combine with digital presence, as Olympic hopefuls hurl not just physical objects but their personal brands into the global spotlight.",
      zh: "在最近的奥运会讨论中，分析人士注意到社交媒体已经改变了我们看待标枪等运动的方式。体育心理学家梅·张博士评论道：\"运动员不再仅仅为了距离而投掷标枪，每一次投掷都将自己推向病毒式的网络名声。\"这种现象突显了传统力量表演如何与数字存在相结合，奥运会希望者不仅投掷实物，还将个人品牌推向全球聚光灯下。"
    }
  }
}

现在我给你单词"${word}"，请返回json。
                `;

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
          model: GEMINI_API_MODEL,
          messages:[
            {role: 'system', content: 'You are a helpful assistant.'},
            {role: 'user', content: prompt},
          ]};
  
        const response = await fetch(GEMINI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GEMINI_API_KEY}`
            },
            body: JSON.stringify(jsonData),
        });
  
        if (!response.ok) {
            console.error(`Gemini AI API call failed: ${response.status} ${response.statusText}`);
            return null;
        }
  
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
  
        // If all checks pass, access and log the message content
        const messageContent = data.choices[0].message.content;
        console.log("API call successful. Received message:");
        console.log(`messageContent: ${ messageContent }`);
  
        const jsonStr = cleanAiJsonResponse(messageContent)
        console.log(`jsonStr: ${ jsonStr }`);

        const repairedStr = jsonrepair(jsonStr)
        console.log(`repairedStr: ${ repairedStr }`);

        const jsonWord = JSON.parse(repairedStr);

        console.log(`jsonWord: ${ jsonWord }`);

        // Validate the structure of the received data if necessary
        return jsonWord;

    } catch (error) {
        console.error('Network error calling Gemini AI API:', error);
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


const generateImageByGeminiAi = async (c, word) => {
  console.log(`Calling Gemini AI for word: ${word}`);
  // This is a placeholder. You need to replace this with your actual API call.
  // Example using fetch:

  const GEMINI_API_KEY = c.env.GEMINI_API_KEY
  const GEMINI_API_ENDPOINT = `${c.env.GEMINI_API_IMAGE_ENDPOINT}?key=${GEMINI_API_KEY}`

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

        const response = await fetch(GEMINI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${GEMINI_API_KEY}`
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

const generateImageByJiMengAi = async (c, word) => {
  console.log(`Calling JiMeng AI for word: ${word}`);
  // This is a placeholder. You need to replace this with your actual API call.
  // Example using fetch:

  const GEMINI_API_KEY = c.env.JIMENG_API_KEY;
  const GEMINI_API_ENDPOINT = c.env.JIMENG_API_ENDPOINT;

  try {
    const prompt = `
你是一名资深的创意工作者。现在我给你一个单词"${word}"，请根据单词的含义创作图片，配色或者图片形式要能够吸引眼球，帮我加深记忆。
              `;

        const jsonData = {
          model: '',
          stream: false,
          messages:[
            {role: 'user', content: prompt}
          ]
        };

        const response = await fetch(GEMINI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GEMINI_API_KEY}`
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
    try {
       const body = await c.req.json();
       slug = body.slug;
       mode = body.mode;
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

    console.warn(`login user: ${ userId }`);

    const wordsFields = {
            id: schema.words.id,
            word_text: schema.words.word_text,
            phonetic: schema.words.phonetic,
            meaning: schema.words.meaning,
            created_at: schema.words.created_at,
            updated_at: schema.words.updated_at,            
          }  

    // Check if slug is provided and not empty
    if (slug && typeof slug === 'string' && slug.trim() !== '') {
        const searchSlug = slug.trim().toLowerCase(); // Use lowercase for search
        console.log(`Performing prefix match for slug: "${searchSlug}"`);
        const prefix = searchSlug + '%';

        // Use Drizzle query builder
        // First try exact match for primary search
        const result = await db.select()
          .from(schema.words)
          .where(eq(schema.words.word_text, searchSlug))
          .limit(1);

        if (result.length > 0) {
             existingWord = result[0];
             console.log(`Found exact match for "${searchSlug}" - ID: ${existingWord.id}`);
        } else {
            // If no exact match, try prefix match
             console.log(`No exact match for "${searchSlug}", trying prefix match.`);
             let prefixResult;
             if (userId && mode !== NavigationMode.Search) {
              prefixResult = await db.select(wordsFields)
                  .from(schema.words)
                  // Use sql tag for LIKE with binding
                  // .where(sql`${schema.words.word_text} LIKE ${prefix}`)
                  .leftJoin(schema.archives,
                      and(
                          eq(schema.words.id, schema.archives.word_id),
                          eq(schema.archives.user_id, userId)
                      )
                  )
                  .where(and(
                    sql`${schema.words.word_text} LIKE ${prefix}`,
                    isNull(schema.archives.word_id)
                  )) // Filter out words with a matching archive entry
                  .limit(1); // Get the first prefix match
             } else {
              prefixResult = await db.select()
                  .from(schema.words)
                  // Use sql tag for LIKE with binding
                  .where(sql`${schema.words.word_text} LIKE ${prefix}`)
                  .limit(1); // Get the first prefix match
             }

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
        let randomResult;
        if (userId) {        
          randomResult = await db.select(wordsFields)
            .from(schema.words)
            .leftJoin(schema.archives,
                and(
                    eq(schema.words.id, schema.archives.word_id),
                    eq(schema.archives.user_id, userId)
                )
            )
            .where(isNull(schema.archives.word_id)) // Filter out words with a matching archive entry             
            // Use sql tag for RANDOM()
            .orderBy(sql`RANDOM()`)
            .limit(1);
        } else {
          randomResult = await db.select()
            .from(schema.words)
            // Use sql tag for RANDOM()
            .orderBy(sql`RANDOM()`)
            .limit(1);
        }
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
          let nextResult;
          if (userId) {
            nextResult = await db.select(wordsFields)
            .from(schema.words)
            // .where(mode === NavigationMode.Next ? gt(schema.words.id, existingWord.id) : lt(schema.words.id, existingWord.id))
            .leftJoin(schema.archives,
                and(
                    eq(schema.words.id, schema.archives.word_id),
                    eq(schema.archives.user_id, userId)
                )
            )
            .where(and(
              mode === NavigationMode.Next ? gt(schema.words.id, existingWord.id) : lt(schema.words.id, existingWord.id),
              isNull(schema.archives.word_id)
            )) // Filter out words with a matching archive entry
            .orderBy(mode === NavigationMode.Next ? asc(schema.words.id) : desc(schema.words.id))            
            .limit(1);
          } else {
            nextResult = await db.select()
            .from(schema.words)
            .where(mode === NavigationMode.Next ? gt(schema.words.id, existingWord.id) : lt(schema.words.id, existingWord.id))
            .orderBy(mode === NavigationMode.Next ? sql`id ASC` : sql`id DESC`)
            .limit(1);
          }

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

        // Return the found word data
        console.log("Returning existing word data.");
        return c.json(wordData, 200);

    } else {
      if (mode !== NavigationMode.Search) {
        console.log("No more word data.");
        return c.json({}, 200);
      }
      // 3. Process New Word (If Not Found) - Call AI and Insert
      console.log(`Word "${slug}" not found in DB. Calling AI.`);

      // Ensure slug is available for AI call (should be if existingWord is null from prefix search)
      if (!slug || typeof slug !== 'string' || slug.trim() === '') {
            // This case should ideally not happen if the slug was empty initially
            // and no random word was found, but handle defensively.
            return c.json({ message: 'Cannot generate data for empty slug.' }, 400);
      }
        const wordToGenerate = slug.trim().toLowerCase();

      // Call Gemini AI to generate data
      const aiResponse = await generateBentoByGeminiAi(c, wordToGenerate);

      if (!aiResponse || !aiResponse[wordToGenerate]) {
          console.error(`AI failed to generate data for "${wordToGenerate}" or returned unexpected format.`);
          return c.json({ message: `Failed to generate data for "${wordToGenerate}".` }, 500);
      }

      const geminiData = aiResponse[wordToGenerate];
      console.log("AI data received, inserting into DB.");

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
            const newWord = insertedWordResult; // Use the result

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

          console.log(`Word "${wordToGenerate}" and content inserted successfully.`);
          // Return the newly created word data with 201 status
          return c.json(wordData, 201);

      } catch (dbError) { // Removed type annotation
          console.error(`Database transaction failed for word "${wordToGenerate}":`, dbError);
          // Rollback is automatic on error with db.transaction
          return c.json({ message: `Failed to save generated data for "${wordToGenerate}".` }, 500);
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

  let slug; // Removed type annotation
  try {
     const body = await c.req.json();
     slug = body.slug;
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
          if (images && images.length > 0) {
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
  } 

  // // Ensure slug is available for AI call (should be if existingWord is null from prefix search)
  // if (!slug || typeof slug !== 'string' || slug.trim() === '') {
  //       // This case should ideally not happen if the slug was empty initially
  //       // and no random word was found, but handle defensively.
  //       return c.json({ message: 'Cannot generate data for empty slug.' }, 400);
  // }
  const wordToGenerate = slug.trim().toLowerCase();

  const imageUrls = await generateImageByJiMengAi(c, wordToGenerate);
  // const imageUrls = ['https://p3-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/c0efd5fd4a414fbaab1232df5e876d6b~tplv-tb4s082cfz-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1749600000&x-signature=sGXKNhKHkj%2F2msIbhAQtcLlGNXk%3D&format=.jpeg', 
  //   'https://p9-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/3bc050392177442ebed27dc883891b7a~tplv-tb4s082cfz-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1749600000&x-signature=uipvjRhc40XXAMDhIBEeO%2BEuit4%3D&format=.jpeg', 
  //   'https://p26-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/76b4331521494f5780d04c7682615124~tplv-tb4s082cfz-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1749600000&x-signature=Gnv%2Fp1XoAo5WqBYUWjIc%2BzoWHTQ%3D&format=.jpeg', 
  //   'https://p9-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/4b7a4ad7e2cb4e11bc1ff38ab4d23da8~tplv-tb4s082cfz-aigc_resize:0:0.jpeg?lk3s=43402efa&x-expires=1749600000&x-signature=UJ8O08ado9UGzoi%2FLya%2FXR4CPRk%3D&format=.jpeg']

  if (imageUrls && imageUrls.length > 0) {
    for (const imageKey of imageUrls) {
      const insertedImageResult = await db.insert(schema.images).values({
        word_id: existingWord.id, // Associate with public user ID 0
        image_key: imageKey,
        })
        // Use .returning() in Drizzle for D1 to get the inserted row
        .returning()
        .get(); // .get() for a single row

      // Check if insertion was successful and returned a row
      if (!insertedImageResult) {
        throw new Error("Failed to insert image into table or get inserted row.");
      }
    }

    console.log(`Word "${wordToGenerate}" and image inserted successfully.`);
    // return c.json({'key': r2ObjectKey}, 200);
    return c.json({imageUrls: imageUrls}, 200);    
  }

  const inlineData = await generateImageByGeminiAi(c, wordToGenerate);

    if (!inlineData) {
      console.error(`AI failed to generate image for "${wordToGenerate}" or returned unexpected format.`);
      return c.json({ message: `Failed to generate image for "${wordToGenerate}".` }, 500);
    }

    const mimeType = inlineData.mimeType || 'application/octet-stream';
    // Convert the base64 string to a Uint8Array
    // Buffer.from() works in Cloudflare Workers and returns a Uint8Array
    let imageBinaryData;
    try {
        imageBinaryData = Buffer.from(inlineData.data, "base64");
        console.log(`Converted base64 image data to Uint8Array of size: ${imageBinaryData.byteLength} bytes`);
    } catch (e) {
        console.error("Failed to convert base64 string to binary data:", e);
        // return null; // Or throw an error
        return c.json({ message: `Failed to generate binary image for "${wordToGenerate}".` }, 500);
    }

    console.log(`AI image received, inserting into R2. ${mimeType}`);

    // Start a database transaction for inserting into multiple tables
    try {
      const objectKey = nanoid(10);
      const objectPath = `${objectKey}.png`
      // const imageMimeType = 'image/png';
      // Upload the binary data to R2
      // The put method takes the object key, the data, and optional options like contentType
      const r2Object = await c.env.WORDBENTO_R2.put(objectPath, imageBinaryData, {
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
        return c.json({imageUrls: [`${c.env.VITE_BASE_URL}/api/word/image/${r2ObjectKey}`]}, 200);
        // return c.json({inlines: [inlineData]}, 200);

    } catch (dbError) { // Removed type annotation
        console.error(`Database transaction failed for word "${wordToGenerate}":`, dbError);
        // Rollback is automatic on error with db.transaction
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

export default word;
