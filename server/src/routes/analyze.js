import { Hono } from 'hono';
// Import necessary Drizzle functions. 'eq' and 'sql' are commonly used.
// Adjust imports based on your Drizzle setup if needed.
// Note: Drizzle ORM can be used with JavaScript, but type safety is lost.
// The 'schema' import is not needed in the JS runtime code itself,
// but the Drizzle client needs to be configured with the schema definition.
// Assuming your Drizzle client is configured elsewhere with the schema.
// For D1 with Drizzle, you typically initialize it like drizzle(env.DB, { schema });
// We'll keep the drizzle import and schema reference in the initialization.
import { drizzle } from 'drizzle-orm/d1';
// The schema object itself is usually defined in a separate file and imported for drizzle initialization
import * as schema from '../db/schema'; // Keep schema import for drizzle initialization
import { sql, eq, and, desc } from 'drizzle-orm'; // Import sql tag for raw SQL fragments like RANDOM() and LIKE
import { jsonrepair } from 'jsonrepair';
import { cleanAiJsonResponse } from './word';
import { calculateMD5 } from '../utils/passwords';
import { extractTextFromSrt } from '../utils/languageParser';
import { checkAndConsumeFreeQuota, getLlmConfig } from '../utils/security';

const analyze = new Hono();

// // Placeholder function to call Gemini AI API
// // Replace with your actual API call logic
// // Type annotations removed
// const extractWordsByGeminiAi = async (c, analysisData) => {
//     console.log(`Calling Gemini AI for source: ${analysisData.sourceType}`);
//     // This is a placeholder. You need to replace this with your actual API call.
//     // Example using fetch:
    
//     const AI_API_ENDPOINT = c.env.GEMINI_API_ENDPOINT

//     try {
//       const prompt = analysisData.sourceType === 'article' ? `
// 我给你一篇文章，请从中将${analysisData.examType}等级的单词筛选出来，请仅以json格式的数组返回，不要包含任何其他文本或解释。
// 文章如下：${analysisData.content}
//                 ` : `我给你一个url，请访问阅读其中的正文，从中将${analysisData.examType}等级的单词筛选出来，请仅以json格式的数组返回，不要包含任何其他文本或解释。。
// URL如下：${analysisData.content}`;

//         const jsonData = {
//           contents:[
//             {
//               parts:[
//                 {
//                   text: prompt
//                 }
//               ]
//             }
//           ]};

//         const response = await fetch(AI_API_ENDPOINT, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 // 'Authorization': `Bearer ${AI_API_KEY}`
//             },
//             body: JSON.stringify(jsonData),
//         });

//         if (!response.ok) {
//             console.error(`Gemini AI API call failed: ${response.status} ${response.statusText}`);
//             return null;
//         }

//         const data = await response.json(); // No type assertion needed in JS
//         // console.log(data);

//         // ['candidates'][0]['content']['parts']]
//         console.log(data.candidates[0].content);

//         const result = data.candidates[0].content.parts[0];
        
//         console.log(result);

//         const jsonStr = cleanAiJsonResponse(result.text)

//         const repairedStr = jsonrepair(jsonStr)
//         console.log(repairedStr);

//         const jsonWord = JSON.parse(repairedStr);

//         // Validate the structure of the received data if necessary
//         return jsonWord;

//     } catch (error) {
//         console.error('Network error calling Gemini AI API:', error);
//         return null;
//     }
    
//     // // --- Mock AI Response for Testing ---
//     // // Remove this mock data in your actual implementation
//     //  console.warn("Using MOCK Gemini AI response!");
//     //  const mockResponse = { // Removed type annotation
//     //      [word.toLowerCase()]: { // Ensure the key matches the requested word slug
//     //          phonetic: "/mɒk/",
//     //          meaning: "模拟数据",
//     //          definition: { icon: "BookOpen", en: "This is a mock definition.", zh: "这是一个模拟定义。" },
//     //          examples: { icon: "FileText", en: ["Mock example 1.", "Mock example 2."], zh: ["模拟例句 1。", "模拟例句 2。"] },
//     //          etymology: { icon: "Atom", en: "Mock etymology.", zh: "模拟词源。" },
//     //          affixes: { icon: "Layers", en: "Mock affixes.", zh: "模拟词缀。" },
//     //          history: { icon: "History", en: "Mock history.", zh: "模拟历史。" },
//     //          forms: { icon: "ArrowUpDown", en: ["Mock form 1", "Mock form 2"], zh: ["模拟形式 1", "模拟形式 2"] },
//     //          memory_aid: { icon: "Lightbulb", en: "Mock memory aid.", zh: "模拟记忆辅助。" },
//     //          trending_story: { icon: "Newspaper", en: "Mock trending story.", zh: "模拟热门故事。" },
//     //          // Add other content types as needed
//     //      }
//     //  };
//     //  return Promise.resolve(mockResponse);
//     // // --- End Mock AI Response ---
// };

const extractWordsByAi = async (c, userId, analysisData, hasFreeQuota) => {
  console.log(`Calling AI for source2: ${analysisData.sourceType}`);

  let candidates = false;

  let llm = await getLlmConfig(c, 'gemini', userId, hasFreeQuota);

  if (llm[1]) {
    candidates = await extractWordsByPlaformAi(c, llm, analysisData);
  }
  if (!candidates || candidates.length === 0) {
    llm = await getLlmConfig(c, 'deepseek', userId, hasFreeQuota);
    if (llm[1]) {
      candidates = await extractWordsByPlaformAi(c, llm, analysisData);
    }
  }

  return candidates;
}

const extractWordsByPlaformAi = async (c, llm, analysisData) => {
  console.log(`Calling ${llm[0]} AI for source2: ${analysisData.sourceType}`);
  // This is a placeholder. You need to replace this with your actual API call.
  // Example using fetch:
  
  let AI_API_ENDPOINT = llm[1]
  let AI_API_KEY = llm[2]
  let AI_API_MODEL = llm[3]

  try {
    const prompt = analysisData.sourceType === 'article' ? `
我给你一篇文章，请从中将${analysisData.examType}等级的单词筛选出来，请仅以json格式的数组返回，不要包含任何其他文本或解释。
文章如下：${analysisData.content}
              ` : `我给你一个url，请访问阅读其中的正文，从中将${analysisData.examType}等级的单词筛选出来，请仅以json格式的数组返回，不要包含任何其他文本或解释。
URL如下：${analysisData.content}`;


      const jsonData = {
        model: AI_API_MODEL,
        messages:[
          {role: 'system', content: 'You are a helpful assistant.'},
          {role: 'user', content: prompt},
        ]};

      console.log(jsonData);  

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
      // console.log(data);

      // 2. Check if the 'choices' array exists and is not empty
      if (!data.choices || data.choices.length === 0) {
        console.error(`${llm[0]} API call failed: Response does not contain any choices.`);
        // Handle this case
        // You might want to log the full response here to debug what was received
        console.log("Full response:", data);
        return null; // Or throw an error
      }

      // 3. Check if the first choice contains a message
      if (!data.choices[0].message) {
          console.error(`${llm[0]} API call failed: The first choice does not contain a message.`);
           // Handle this case
           console.log("Full response:", data);
          return null; // Or throw an error
      }

      // If all checks pass, access and log the message content
      const messageContent = data.choices[0].message.content;
      console.log("API call successful. Received message:");
      console.log(`messageContent: ${messageContent}`);

      const jsonStr = cleanAiJsonResponse(messageContent)

      const repairedStr = jsonrepair(jsonStr.toLowerCase())
      console.log(`repairedStr: ${repairedStr}`);

      const jsonWords = JSON.parse(repairedStr);

      // Validate the structure of the received data if necessary
      return jsonWords;

  } catch (error) {
      console.error(`Network error calling ${llm[0]} AI API:`, error);
      return null;
  }
};

const extractWordsByScraper = async (c, url) => {
  console.log(`Calling Youtube Scraper API for url: ${url}`);
  // This is a placeholder. You need to replace this with your actual API call.
  // Example using fetch:

  const YOUTUBE_SCRAPER_ENDPOINT = c.env.YOUTUBE_SCRAPER_ENDPOINT + '/analyze-youtube-http'

  try {

      const jsonData = { url: url };

      const response = await fetch(YOUTUBE_SCRAPER_ENDPOINT, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(jsonData),
      });

      if (!response.ok) {
          console.error(`Youtube Scraper API call failed: ${response.status} ${response.statusText}`);
          return null;
      }

      const data = await response.json(); // No type assertion needed in JS
      // console.log(data);

      // 2. Check if the 'choices' array exists and is not empty
      if (!data.task_id) {
        console.error("Youtube Scraper API call failed: Response does not contain task_id.");
        // Handle this case
        // You might want to log the full response here to debug what was received
        console.log("Full response:", data);
        return null; // Or throw an error
      }

      return data;

  } catch (error) {
      console.error('Network error calling Youtube Scraper API:', error);
      return null;
  }
};

const pollingStatusFromScraper = async (c, taskId) => {
  console.log(`Calling Youtube Scraper Polling API for taskId: ${taskId}`);
  // This is a placeholder. You need to replace this with your actual API call.
  // Example using fetch:

  const YOUTUBE_SCRAPER_POLLING_ENDPOINT = c.env.YOUTUBE_SCRAPER_ENDPOINT + '/tasks/' + taskId;
  console.log(`YOUTUBE_SCRAPER_POLLING_ENDPOINT: ${YOUTUBE_SCRAPER_POLLING_ENDPOINT}`);

  try {

      const response = await fetch(YOUTUBE_SCRAPER_POLLING_ENDPOINT, {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json',
          }
      });

      if (!response.ok) {
          console.error(`Youtube Scraper Polling API call failed: ${response.status} ${response.statusText}`);
          return null;
      }

      const data = await response.json(); // No type assertion needed in JS
      console.log(`pollingStatusFromScraper ${JSON.stringify(data)}`);

      // 2. Check if the 'choices' array exists and is not empty
      if (!data.task_id) {
        console.error("Youtube Scraper Polling API call failed: Response does not contain task_id.");
        // Handle this case
        // You might want to log the full response here to debug what was received
        console.log("Full response:", data);
        return null; // Or throw an error
      }

      return data;

  } catch (error) {
      console.error('Network error calling Youtube Scraper Polling API:', error);
      return null;
  }
};

const getSrtFromScraperThenExtractWords = async (c, db, task, examType) => {
  console.log(`Calling Youtube Scraper SRT API for taskId: ${task.uuid}`);
  // This is a placeholder. You need to replace this with your actual API call.
  // Example using fetch:

  const YOUTUBE_SCRAPER_SRT_ENDPOINT = c.env.YOUTUBE_SCRAPER_ENDPOINT + '/tasks/' + task.uuid + '/srt';

  try {

      const response = await fetch(YOUTUBE_SCRAPER_SRT_ENDPOINT, {
          method: 'GET',
        //   headers: {
        //       'Content-Type': 'application/octet-stream',
        //   }
      });

      if (!response.ok) {
          console.error(`Youtube Scraper SRT API call failed: ${response.status} ${response.statusText}`);
          return null;
      }

    let download_title; // 默认文件名

    // 1. 尝试从 Content-Disposition 头获取文件名
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
        console.log("Content-Disposition header found:", contentDisposition);
        // 正则表达式来匹配 filename 或 filename*
        const filenameMatch = contentDisposition.match(/filename\*?=(?:['"](?:[\w%!-.]*)['"]|([^;]+))/i);
        
        if (filenameMatch && filenameMatch[1]) {
            // 处理 RFC 5987 编码 (filename*=UTF-8''%E4%B8%AD%E6%96%87%E6%96%87%E4%BB%B6.txt)
            try {
                const encodedFilename = filenameMatch[1].trim();
                if (encodedFilename.startsWith("UTF-8''")) {
                    download_title = decodeURIComponent(encodedFilename.substring(7));
                } else {
                    // 处理常规 filename="example.txt"
                    download_title = encodedFilename.replace(/^"|"$/g, ''); // 移除可能的引号
                }
                console.log("Filename extracted from Content-Disposition:", download_title);
            } catch (e) {
                console.warn("Failed to decode filename from Content-Disposition, using fallback.", e);
            }
        } else {
            // Fallback for older or less standard filename formats
            const oldFilenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
            if (oldFilenameMatch && oldFilenameMatch[1]) {
                download_title = oldFilenameMatch[1];
                console.log("Filename extracted from old Content-Disposition format:", download_title);
            }
        }
    } else {
        console.warn("Content-Disposition header not found. Using default filename.");
    }

    if (download_title) {
      // 查找最后一个点 '.' 的索引
      const lastDotIndex = download_title.lastIndexOf('.');

      // 如果找到了点，并且它不是字符串的第一个字符（以处理 .gitignore 这样的情况），
      // 则截取到该点之前的部分。
      // 否则，如果文件名没有扩展名，或者以点开头，则返回原字符串。
      if (lastDotIndex !== -1 && lastDotIndex > 0) {
        download_title = download_title.substring(0, lastDotIndex);
      }

      download_title = download_title.replaceAll('-', ' ')
    }

    // --- Add this line to convert the response body to a string ---
    const srtContent = await response.text();
    console.log("SRT Content Received:");
    console.log(srtContent);
    // -----------------------------------------------------------
    if (srtContent) {
      const txtContent = extractTextFromSrt(srtContent)
      console.log("TXT Content Received:");
      console.log(txtContent);    

      try {

          const existingAttachments = await db.select({
              id: schema.attachments.id
          })
          .from(schema.attachments)
          .where(eq(schema.attachments.resource_id, task.id))
          .limit(1); // We only need to find one match
          
          if (existingAttachments.length > 0) {
              await db.update(schema.attachments)
                  .set({
                      title: download_title,
                      caption_srt: srtContent,
                      caption_txt: txtContent
                  })
                  .where(eq(schema.attachments.id, existingAttachments[0].id));
          } else {
              const insertedResult = await db.insert(schema.attachments).values({
                  resource_id: task.id, // Associate with public user ID 0
                  title: download_title,
                  caption_srt: srtContent,
                  caption_txt: txtContent
              })
              // Use .returning() in Drizzle for D1 to get the inserted row
              .returning()
              .get(); // .get() for a single row

              // Check if insertion was successful and returned a row
              if (!insertedResult) {
                  throw new Error("Failed to insert srt into table or get inserted row.");
              }
          }
      } catch (dbError) { // Removed type annotation
          console.error(`Database transaction failed for task "${task.uuid}":`, dbError);
      }

      console.log(`Task "${task.uuid}" srtContent inserted successfully.`);
        
      const analysisData = {
          title: download_title,
          sourceType: 'article',
          content: txtContent,
          examType: examType,
      }

      await simulateAnalysisTask(c, task.uuid, db, analysisData);        
    }

  } catch (error) {
      console.error('Network error calling Youtube Scraper SRT API:', error);
    //   return null;
  }
};

const getAudioFromScraperThenExtractWords = async (c, db, task, examType) => {
  console.log(`Calling Youtube Scraper Audio API for taskId: ${task.uuid}`);
  // This is a placeholder. You need to replace this with your actual API call.
  // Example using fetch:

  const YOUTUBE_SCRAPER_SRT_ENDPOINT = c.env.YOUTUBE_SCRAPER_ENDPOINT + '/tasks/' + task.uuid + '/audio';

  try {

      const response = await fetch(YOUTUBE_SCRAPER_SRT_ENDPOINT, {
          method: 'GET',
        //   headers: {
        //       'Content-Type': 'application/octet-stream',
        //   }
      });

      if (!response.ok) {
          console.error(`Youtube Scraper Audio API call failed: ${response.status} ${response.statusText}`);
          return null;
      }

    // --- Get the MP3 file as a Blob or ArrayBuffer ---
    const audioBlob = await response.blob(); // Get the response body as a Blob
    // Or, if you prefer ArrayBuffer: const audioBuffer = await response.arrayBuffer();
    console.log(`Received audio blob of size: ${audioBlob.size} bytes`);

    // --- Extract filename from Content-Disposition header ---
    const contentDisposition = response.headers.get('Content-Disposition');
    let originalFilename = `wordbento-${task.uuid}.mp3`; // Fallback filename

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;=\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        originalFilename = filenameMatch[1].replace(/['"]/g, ''); // Remove quotes if present
      }
      // Handle UTF-8 encoded filenames (filename*=UTF-8'') if your server sends them
      const filenameUtf8Match = contentDisposition.match(/filename\*=UTF-8''([^;=\n]*)/i);
      if (filenameUtf8Match && filenameUtf8Match[1]) {
        try {
          originalFilename = decodeURIComponent(filenameUtf8Match[1]);
        } catch (e) {
          console.warn('Failed to decode UTF-8 filename from Content-Disposition', e);
        }
      }
    }

    console.log(`Decode audio filename from Content-Disposition ${originalFilename}`);

    // 保存到r2
    // Start a database transaction for inserting into multiple tables
    try {
    //   const objectKey = originalFilename
      const objectPath = originalFilename
      // const imageMimeType = 'image/png';
      // Upload the binary data to R2
      // The put method takes the object key, the data, and optional options like contentType
      const r2Object = await c.env.WORDBENTO_R2.put(objectPath, audioBlob, {
        contentType: 'audio/mpeg' //|| 'application/octet-stream', // Set the MIME type
        // Add other options here if needed, e.g., customMetadata, httpMetadata
        // httpMetadata: {
        //     cacheControl: 'max-age=31536000', // Example: Cache for 1 year
        // },
      });

      let r2ObjectKey;
      if (r2Object) {
          console.log(`Audio stored successfully in R2 with key: ${r2Object.key}`);
          // Return the key of the stored object
          r2ObjectKey = r2Object.key;
      } else {
           console.error("Failed to upload Audio to R2.");
          //  return c.json({ message: `Failed to upload image for "${wordToGenerate}".` }, 500);
          throw new Error("Failed to upload Audio to R2.");
      }      

      const existingAttachments = await db.select({
        id: schema.attachments.id
      })
      .from(schema.attachments)
      .where(
          and(
              eq(schema.attachments.resource_id, task.id),
          )
      )
      .limit(1); // We only need to find one match

      if (existingAttachments.length > 0) {
        await db.update(schema.attachments)
            .set({
                audio_key: r2ObjectKey
            })
            .where(eq(schema.attachments.id, existingAttachments[0].id));
      } else {
        const insertedResult = await db.insert(schema.attachments).values({
            resource_id: task.id, // Associate with public user ID 0
            audio_key: r2ObjectKey,
        })
        // Use .returning() in Drizzle for D1 to get the inserted row
        .returning()
        .get(); // .get() for a single row

        // Check if insertion was successful and returned a row
        if (!insertedResult) {
            throw new Error("Failed to insert audio into table or get inserted row.");
        }
    }
    console.log(`Task "${task.uuid}" audio inserted successfully.`);

    } catch (dbError) { // Removed type annotation
        console.error(`Database transaction failed for task "${task.uuid}":`, dbError);
    }


  } catch (error) {
      console.error('Network error calling Youtube Scraper Audio API:', error);
    //   return null;
  }
};

const isYouTubeLinkRegex = function(url) {
  if (typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  // Regex for various YouTube URL formats
  // - youtube.com (with optional www, m, music, gaming subdomains)
  // - youtu.be
  // - Handles http/https, optional query parameters
  const youtubeRegex = /^(https?:\/\/)?(www\.|m\.|music\.|gaming\.)?(youtube\.com|youtu\.be)\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i;

  return youtubeRegex.test(url);
};

// --- Analysis Task Submission Route (New) ---
analyze.post('/', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
    // return c.json([], 200); // Return 200 OK for existing
  }

  const db = drizzle(c.env.DB, { schema });
  let analysisData;

  // 1. Validate input
  try {
      analysisData = await c.req.json();
      // TODO: Add more robust validation using Zod or similar
      if (!analysisData || !analysisData.sourceType || !analysisData.content || !analysisData.examType) {
          return c.json({ message: 'Invalid analysis data provided.' }, 400);
      }
       // Basic type checks (should align with AnalysisData interface)
      if (typeof analysisData.sourceType !== 'string' || typeof analysisData.content !== 'string' || typeof analysisData.examType !== 'string') {
           return c.json({ message: 'Invalid data types in analysis request.' }, 400);
      }
       // Basic enum checks (should align with AnalysisData interface)
       const validSourceTypes = ['url', 'article'];
      //  const validExamTypes = ['托福', 'GRE', 'TOEIC', 'SAT', '6级'];
      //  if (!validSourceTypes.includes(analysisData.sourceType) || !validExamTypes.includes(analysisData.examType)) {
        if (!validSourceTypes.includes(analysisData.sourceType)) {
            return c.json({ message: 'Invalid sourceType value.' }, 400);
       }

  } catch (e) {
      console.error("Failed to parse analysis request body:", e);
      return c.json({ message: 'Invalid JSON body' }, 400);
  }

  // TODO: Get authenticated user ID (replace with actual auth logic)
  const userId = user.id; // Placeholder for public user or replace with actual user ID

  // 2. Clean the content by removing leading/trailing whitespace (including newlines)
  const cleanedContent = analysisData.content.trim();

  // Check if content is empty after cleaning
  if (!cleanedContent) {
      return c.json({ message: 'Content cannot be empty after cleaning.' }, 400);
  }

 // 2. Calculate MD5 hash of the content
  let contentMD5;
  try {
      contentMD5 = calculateMD5(cleanedContent);
      console.log(`Calculated MD5 for content: ${contentMD5}`);
  } catch (md5Error) {
      console.error("Failed to calculate MD5 hash:", md5Error);
      return c.json({ message: 'Failed to process content hash.' }, 500);
  }

  // youtube链接需要额外处理
  const isYoutube = isYouTubeLinkRegex(cleanedContent);

  console.log(`Content is Youtube??: ${isYoutube}`);

  // 3. Check if a record with the same exam_type and content_md5 already exists
  try {
      const existingResources = await db.select({
        status: schema.resources.status,
        uuid: schema.resources.uuid // Select only the uuid
      })
      .from(schema.resources)
      .where(
          and(
              eq(schema.resources.exam_type, analysisData.examType),
              eq(schema.resources.content_md5, contentMD5) // Filter by the calculated MD5
          )
      )
      .limit(1); // We only need to find one match

      if (existingResources.length > 0) {
        console.log(`existingResources: ${isYoutube}, ${JSON.stringify(existingResources[0])}`)
        // if (!isYoutube || (existingResources[0].status == 'completed' || existingResources[0].status == 'failed')) {
        if (!isYoutube || (existingResources[0].status !== 'failed')) {
            // console.log('45678909876545678');
             // Record exists, return its UUID
            console.log(`Existing resource found with UUID: ${existingResources[0].uuid}`);
            return c.json({ uuid: existingResources[0].uuid }, 200); // Return 200 OK for existing
        }
      }

  } catch (checkError) {
      console.error("Failed to check for existing resource in DB:", checkError);
      // Continue to insert if checking fails, or return an error depending on desired behavior
      // For now, let's return an error if the check itself failed
      return c.json({ message: 'Failed to check for existing resource.' }, 500);
  }

  try {
    let taskId;
    if (isYoutube) {
        // 如果是youtube链接，需要额外处理
        const scraperResult = await extractWordsByScraper(c, cleanedContent)
        if (!scraperResult) {
            return c.json({ message: 'Failed to initiate youtube analysis task1.' }, 500);    
        }
        console.log(scraperResult);
        taskId = scraperResult.task_id;
        if (!taskId) {
            return c.json({ message: 'Failed to initiate youtube analysis task2.' }, 500);    
        }
    } else {  
        // 2. Create a new task in the database
        taskId = crypto.randomUUID(); // Generate a unique task ID
    } 

      // 新增标题
      const title = cleanedContent.length > 50 && cleanedContent.substring(0, 47) + '...' || cleanedContent;

      await db.insert(schema.resources).values({
          user_id: userId,
          title: title,
          source_type: analysisData.sourceType,
          content: cleanedContent,
          exam_type: analysisData.examType,
          content_md5: contentMD5,
          status: 'pending', // Initial status
          uuid: taskId
          // result and error are null initially
      });
      console.log(`Analysis task created with ID: ${taskId}`);

      // 3. Initiate the background analysis process
      // TODO: This is where you would typically queue a background job
      // that performs the actual AI analysis. This part is conceptual here.
      // The background process would update the task status and result in the database.
      console.log(`Simulating background analysis start for task ID: ${taskId}`);
      // Example: send a message to a queue, or trigger a separate worker process
      // await c.env.TASK_QUEUE.send({ taskId: taskId, data: analysisData }); // Example using a queue binding

      if (!isYoutube) {
        // For this example, we'll simulate the task completion in a few seconds
        // In a real app, the background process would do this.
        await simulateAnalysisTask(c, taskId, db, { ...analysisData, content: cleanedContent }); // Call simulation function
      }

      // 4. Return the task ID to the client
      return c.json({ uuid: taskId }, 201); // 201 Created

  } catch (dbError) {
      console.error("Failed to create analysis task in DB:", dbError);
      return c.json({ message: 'Failed to initiate analysis task.' }, 500);
  }
});

// --- Update ---
analyze.post('/update', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
    // return c.json([], 200); // Return 200 OK for existing
  }

  const db = drizzle(c.env.DB, { schema });
  let analysisData;

  // 1. Validate input
  try {
      analysisData = await c.req.json();
      // TODO: Add more robust validation using Zod or similar
      if (!analysisData || !analysisData.id) {
          return c.json({ message: 'Invalid analysis data provided.' }, 400);
      }
      if (analysisData.audioKey === undefined && analysisData.captionSrt === undefined) {
        return c.json({ message: 'Invalid data types in analysis request.' }, 400);
      }
  } catch (e) {
      console.error("Failed to parse analysis request body:", e);
      return c.json({ message: 'Invalid JSON body' }, 400);
  }

  const existingTask = await db.select()
      .from(schema.resources)
      .where(eq(schema.resources.id, analysisData.id))
      .limit(1)
      .get();

  if (!existingTask) {
      console.warn(`Task not exist: ${analysisData.id}`);
      return c.json({ message: 'Task not found' }, 404);
  }

  // // TODO: Get authenticated user ID (replace with actual auth logic)
  // const userId = user.id; // Placeholder for public user or replace with actual user ID

  let values = {};  
  if ('audioKey' in analysisData) {
    values.audio_key = analysisData.audioKey;
  }
  if ('captionSrt' in analysisData) {
    values.caption_srt = analysisData.captionSrt;
    const captionTxt = extractTextFromSrt(analysisData.captionSrt);
    values.caption_txt = captionTxt;
    if (captionTxt.length > 16) {
      values.title = captionTxt.substring(0, 16);
    } else {
      values.title = captionTxt;
    }
  }

  // 3. Check if a record with the same exam_type and content_md5 already exists
  try {
      const existingAttachments = await db.select({
        id: schema.attachments.id,
      })
      .from(schema.attachments)
      .where(eq(schema.attachments.resource_id, analysisData.id))
      .limit(1); // We only need to find one match

      if (existingAttachments.length > 0) {
        console.log(`existingAttachments: ${JSON.stringify(existingAttachments[0])}`)
        // 成功
        await db.update(schema.attachments)
            .set(values)
            .where(eq(schema.attachments.id, existingAttachments[0].id));  
      } else {
        values.resource_id = analysisData.id
        const insertedResult = await db.insert(schema.attachments).values(values)
        // Use .returning() in Drizzle for D1 to get the inserted row
        .returning()
        .get(); // .get() for a single row

        // Check if insertion was successful and returned a row
        if (!insertedResult) {
            throw new Error("Failed to insert srt into table or get inserted row.");
        }
      }

  } catch (checkError) {
      console.error("Failed to check for existing attachment in DB:", checkError);
      // Continue to insert if checking fails, or return an error depending on desired behavior
      // For now, let's return an error if the check itself failed
      return c.json({ message: 'Failed to check for existing attachment.' }, 500);
  }

  if (values.caption_txt) {
    const simulateAnalysisData = {
        title: values.title,
        sourceType: 'article',
        content: values.caption_txt,
        examType: existingTask.exam_type,
    }

    await simulateAnalysisTask(c, existingTask.uuid, db, simulateAnalysisData);
  }

  // let taskId;
  // try {
  //     const existingResources = await db.select({
  //       status: schema.resources.status,
  //       uuid: schema.resources.uuid // Select only the uuid
  //     })
  //     .from(schema.resources)
  //     .where(eq(schema.resources.id, analysisData.id))
  //     .limit(1); // We only need to find one match

  //     if (existingResources.length > 0) {
  //       console.log(`existingResources: ${JSON.stringify(existingResources[0])}`)
  //       taskId = existingResources[0].uuid;
  //       // if (!isYoutube || (existingResources[0].status == 'completed' || existingResources[0].status == 'failed')) {
  //       if (existingResources[0].status !== 'completed') {
  //         // 成功
  //         await db.update(schema.resources)
  //             .set({
  //                 status: 'completed',
  //                 // result: JSON.stringify(candidates), // Store result as JSON string
  //                 updated_at: sql`CURRENT_TIMESTAMP`
  //             })
  //             .where(eq(schema.resources.id, analysisData.id));
  //       }
  //     } else {
  //       return c.json({ message: 'Invalid resource.' }, 400);
  //     }

  // } catch (checkError) {
  //     console.error("Failed to check for existing resource in DB:", checkError);
  //     // Continue to insert if checking fails, or return an error depending on desired behavior
  //     // For now, let's return an error if the check itself failed
  //     return c.json({ message: 'Failed to check for existing resource.' }, 500);
  // }      
  // 4. Return the task ID to the client
  return c.json({ uuid: existingTask.uuid }, 201); // 201 Created
});

analyze.get('/history', async (c) => {
  const user = c.get('user');
  if (!user) {
    // return c.json({ message: 'Forbidden' }, 403);
    return c.json([], 200); // Return 200 OK for existing
  }

  const limit = parseInt(c.req.query('limit') || 4, 10);
  const offset = parseInt(c.req.query('offset') || 0, 10);

  const db = drizzle(c.env.DB, { schema });
  
  try {
      const existingResources = await db.select({
          uuid: schema.resources.uuid,
          sourceType: schema.resources.source_type,
          examType: schema.resources.exam_type,
          content: schema.resources.content, 
          words: schema.resources.result,
          audioKey: schema.attachments.audio_key,
          captionSrt: schema.attachments.caption_srt,
      })
      .from(schema.resources)
        .leftJoin(schema.attachments,
            and(
                eq(schema.attachments.resource_id, schema.resources.id)
            )
        )      
      .where(and(
        eq(schema.resources.user_id, user.id), 
        eq(schema.resources.status, 'completed'))
        )
      .orderBy(desc(schema.resources.id))
      .offset(offset)
      .limit(limit);

      if (existingResources.length > 0) {
        existingResources.forEach(r => {
            r.content = r.content.substring(0, 47) + '...';
            r.audioKey = !!r.audioKey;
            r.captionSrt = !!r.captionSrt;
        });
        // Record exists, return its UUID
        console.log(`Existing resource found with length: ${existingResources.length}`);
      }
      return c.json(existingResources, 200); // Return 200 OK for existing

  } catch (checkError) {
      console.error("Failed to check for existing resource in DB:", checkError);
      // Continue to insert if checking fails, or return an error depending on desired behavior
      // For now, let's return an error if the check itself failed
      return c.json({ message: 'Failed to check for existing resource.' }, 500);
  }

});


analyze.get('/list/:limit/:page', async (c) => {
  const user = c.get('user');
  if (!user) {
    // return c.json({ message: 'Forbidden' }, 403);
    return c.json([], 200); // Return 200 OK for existing
  }

  // 从查询参数中提取 page 和 limit
  const page = parseInt(c.req.param('page') || '1', 10);
  const limit = parseInt(c.req.param('limit') || '20', 10); // 每页20条数据

    console.log(`page and limit: ${page} ${limit}`)
  // 验证 page 和 limit
  if (isNaN(page) || page < 1) {
    return c.json({ message: 'Invalid page number. Must be a positive integer.' }, 400);
  }
  if (isNaN(limit) || limit < 1 || limit > 100) { // 设置最大 limit 以防止滥用
    return c.json({ message: 'Invalid limit. Must be between 1 and 100.' }, 400);
  }

  const offset = (page - 1) * limit;

  const db = drizzle(c.env.DB, { schema });
  
  try {
    // 1.1. 获取总记录数
    const countResult = await db.select({
        count: sql`count(${schema.resources.id})`
    })
    .from(schema.resources)
    .where(eq(schema.resources.user_id, user.id));

    const totalCount = countResult[0].count;
        
    const paginatedResources = await db.select({
        id: schema.resources.id,
        uuid: schema.resources.uuid,
        title: schema.resources.title,
        sourceType: schema.resources.source_type,
        examType: schema.resources.exam_type,
        content: schema.resources.content, 
        words: schema.resources.result,
        status: schema.resources.status,
        error: schema.resources.error,
        createdAt: schema.resources.created_at,
        audioKey: schema.attachments.audio_key,
        captionSrt: schema.attachments.caption_srt,
    })
    .from(schema.resources)
      .leftJoin(schema.attachments,
          and(
              eq(schema.attachments.resource_id, schema.resources.id)
          )
      )      
    .where(eq(schema.resources.user_id, user.id))
    .orderBy(desc(schema.resources.id))
    .limit(limit)
    .offset(offset);

    if (paginatedResources.length > 0) {
      paginatedResources.forEach(r => {
          r.content = r.content.substring(0, 47) + '...';
          r.audioKey = !!r.audioKey;
          r.captionSrt = !!r.captionSrt;
      });
        // Record exists, return its UUID
        console.log(`Existing resource found with length: ${paginatedResources.length}`);
        // return c.json(existingResources, 200); // Return 200 OK for existing
    }

    // 返回分页数据和总记录数
    return c.json({
      data: paginatedResources,
      totalCount: totalCount
    }, 200);    

  } catch (checkError) {
      console.error("Failed to check for existing resource in DB:", checkError);
      return c.json({ message: 'Failed to list existing resources.' }, 500);
  }

});


// 2. /resource/:id 端点：获取单个资源的完整详细信息，包括所有附件
// 返回 ResourceWithAttachments
analyze.get('/detail/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
  }

  const resourceId = parseInt(c.req.param('id') || '0', 10);
  if (!resourceId) {
    return c.json({ message: 'Invalid resource ID.' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });

  try {
    // 2.1. 获取资源本身
    const resource = await db.select({
        id: schema.resources.id,
        uuid: schema.resources.uuid,
        sourceType: schema.resources.source_type,
        examType: schema.resources.exam_type,
        content: schema.resources.content, 
        words: schema.resources.result,
    })
      .from(schema.resources)
      .where(and(
        eq(schema.resources.id, resourceId),
        eq(schema.resources.user_id, user.id) // 确保用户只能访问自己的资源
      ))
      .limit(1);

    if (resource.length === 0) {
      return c.json({ message: 'Resource not found or unauthorized.' }, 404);
    }

    // 2.2. 获取该资源的所有附件
    const attachments = await db.select({
        id: schema.attachments.id,
        // resourceId: schema.attachments.resource_id,
        audioKey: schema.attachments.audio_key,
        videoKey: schema.attachments.video_key,
        captionSrt: schema.attachments.caption_srt, 
        captionTxt: schema.attachments.caption_txt, 
    })
      .from(schema.attachments)
      .where(eq(schema.attachments.resource_id, resourceId));

    // 2.3. 组合资源和附件，形成 ResourceWithAttachments 结构
    const fullResource = {
      ...resource[0], // Assuming resource[0] contains all fields from schema.resources
      attachments: attachments,
    };

    // Note: The `result` column from resources is mapped to `words` in frontend.
    // Ensure `resource[0].result` is correctly handled if it needs renaming to `words`.
    // For simplicity, we assume `result` is directly compatible or renamed on frontend.

    return c.json(fullResource, 200);

  } catch (error) {
    console.error(`Failed to fetch resource ${resourceId}:`, error);
    return c.json({ message: 'Failed to fetch resource details.' }, 500);
  }
});


// Delete upload (admin only)
analyze.delete('/detail/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
  }

  const resourceId = parseInt(c.req.param('id') || '0', 10);
  if (!resourceId) {
    return c.json({ message: 'Invalid resource ID.' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });
  try {
      const existingResources = await db.select({
        id: schema.resources.id,
      })
      .from(schema.resources)
      .where(and(
        eq(schema.resources.id, resourceId),
        eq(schema.resources.user_id, user.id),
      ));
      // .limit(1); 

    if (existingResources.length == 0) {
        return c.json({ message: 'Bad Request: Invalid resource id' }, 400);
    }

    // const resourceId = existingResources[0].id;

    try {
      const existingAttachments = await db.select({
          audio_key: schema.attachments.audio_key,
          video_key: schema.attachments.video_key,
      })
      .from(schema.attachments)
      .where(eq(schema.attachments.resource_id, resourceId));
      // .limit(1);

      // if (existingAttachments.length == 0) {
      //     return new Response('Bad Request: Invalid uuid.', { status: 400 });
      // }    

      if (existingAttachments.length > 0) {
        for (const existingAttachment of existingAttachments) {
          let objectKey = existingAttachment.audio_key;
          if (objectKey) {
            await c.env.WORDBENTO_R2.delete(objectKey);

            console.log(`R2 Object "${objectKey}" has been deleted successfully.`);
          }

          objectKey = existingAttachment.video_key;
          if (objectKey) {
            await c.env.WORDBENTO_R2.delete(objectKey);

            console.log(`R2 Object "${objectKey}" has been deleted successfully.`);
          }
        }

        await db.delete(schema.attachments)
        .where(eq(schema.attachments.resource_id, resourceId));
      }
    } catch (error) {
      console.error(`Error deleting resource "${resourceId}" from R2:`, error);
    }

    await db.delete(schema.resources)
    .where(eq(schema.resources.id, resourceId));

    console.log(`Deleting resource successfully: "${resourceId}"`);

    return c.json({}, 200);
  } catch (dbError) {
    console.error(`Error deleting resource "${resourceId}":`, dbError);
    return c.json({ message: 'Internal Server Error: Failed to deleting resource' }, 500);
  }
});

// 获取资源关联的音频
analyze.get('/audio/:uuid', async (c) => {
  // // Ensure the request has a JSON body
  // if (!c.req.header('Content-Type')?.includes('application/json')) {
  //     return c.json({ message: 'Invalid Content-Type, expected application/json' }, 415);
  // }

  console.log('Attempting to retrieve audio from local R2');

  const uuid = c.req.param('uuid');
  // If objectKey is empty, it's a bad request
  if (!uuid) {
    return new Response('Bad Request: Missing uuid.', { status: 400 });
  }  

  console.log(`Attempting to retrieve audio from local R2 with uuid: "${uuid}"`);

  const db = drizzle(c.env.DB, { schema });
  try {
      const existingResources = await db.select({
        id: schema.resources.id,
      })
      .from(schema.resources)
      .where(eq(schema.resources.uuid, uuid))
      .limit(1); // We only need to find one match

    if (existingResources.length == 0) {
        return new Response('Bad Request: Invalid uuid.', { status: 400 });
    }

    const resourceId = existingResources[0].id;

    const existingAttachments = await db.select({
        audio_key: schema.attachments.audio_key,
    })
    .from(schema.attachments)
    .where(eq(schema.attachments.resource_id, resourceId))
    .limit(1); // We only need to find one match    

    if (existingAttachments.length == 0) {
        return new Response('Bad Request: Invalid uuid.', { status: 400 });
    }    

    const objectKey = existingAttachments[0].audio_key;

    // console.log(`Attempting to retrieve audio from local R2 with objectKey: "${objectKey}"`);

    // Get the object from the R2 bucket
    const object = await c.env.WORDBENTO_R2.get(objectKey);

    // Check if the object exists
    if (object === null) {
      console.warn(`audio not found in local R2: "${objectKey}"`);
      return new Response('Not Found', { status: 404 });
    }

    console.log(`Successfully retrieved audio "${object.httpMetadata}" from local R2.`);

    // Return the image data with the correct content type
    // We clone the headers to avoid modifying the original object headers
    const headers = new Headers(object.httpMetadata);
    headers.set('ETag', object.etag); // Include ETag for caching

    // Add CORS headers if your frontend is on a different origin during local development
    headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins for local testing
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*'); // Allow all headers
    // 必须加上，否则客户端拖拽有问题
    headers.set('Accept-Ranges', 'bytes');

    return new Response(object.body, {
      status: 200, // HTTP status code 200 OK
      headers: headers,
    });

  } catch (error) {
    console.error(`Error retrieving audio "${uuid}" from local R2:`, error);
    return new Response('Internal Server Error: Failed to retrieve audio.', { status: 500 });
  }
});

// 获取资源关联的字幕
analyze.get('/srt/:uuid', async (c) => {
  // // Ensure the request has a JSON body
  // if (!c.req.header('Content-Type')?.includes('application/json')) {
  //     return c.json({ message: 'Invalid Content-Type, expected application/json' }, 415);
  // }

  console.log('Attempting to retrieve srt from DB');

  const uuid = c.req.param('uuid');
  // If objectKey is empty, it's a bad request
  if (!uuid) {
    return new Response('Bad Request: Missing uuid.', { status: 400 });
  }  

  console.log(`Attempting to retrieve srt from DB with uuid: "${uuid}"`);

  const db = drizzle(c.env.DB, { schema });
  try {
      const existingResources = await db.select({
        id: schema.resources.id,
      })
      .from(schema.resources)
      .where(eq(schema.resources.uuid, uuid))
      .limit(1); // We only need to find one match

    if (existingResources.length == 0) {
        return new Response('Bad Request: Invalid uuid.', { status: 400 });
    }

    const resourceId = existingResources[0].id;

    const existingAttachments = await db.select({
        caption_srt: schema.attachments.caption_srt,
    })
    .from(schema.attachments)
    .where(eq(schema.attachments.resource_id, resourceId))
    .limit(1); // We only need to find one match    

    if (existingAttachments.length == 0) {
        return new Response('Bad Request: Invalid uuid.', { status: 400 });
    }    

    const captionSrt = existingAttachments[0].caption_srt;

    const headers = new Headers();
    // // Add CORS headers if your frontend is on a different origin during local development
    // headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins for local testing
    // headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    // headers.set('Access-Control-Allow-Headers', '*'); // Allow all headers

    headers.set('Content-Type', 'text/plain;charset=UTF-8');

    return new Response(captionSrt, {
      status: 200, // HTTP status code 200 OK
      headers: headers,
    });

  } catch (error) {
    console.error(`Error retrieving srt "${uuid}" from DB:`, error);
    return new Response('Internal Server Error: Failed to retrieve srt.', { status: 500 });
  }
});


// 获取资源关联的完整文本
analyze.get('/content/:uuid', async (c) => {
  console.log('Attempting to retrieve full content from DB');

  const uuid = c.req.param('uuid');
  // If objectKey is empty, it's a bad request
  if (!uuid) {
    return new Response('Bad Request: Missing uuid.', { status: 400 });
  }  

  console.log(`Attempting to retrieve full content from DB with uuid: "${uuid}"`);

  const db = drizzle(c.env.DB, { schema });
  try {
      const existingResources = await db.select({
        content: schema.resources.content,
      })
      .from(schema.resources)
      .where(eq(schema.resources.uuid, uuid))
      .limit(1); // We only need to find one match

    if (existingResources.length == 0) {
        return new Response('Bad Request: Invalid uuid.', { status: 400 });
    }

    const content = existingResources[0].content;

    const headers = new Headers();
    // // Add CORS headers if your frontend is on a different origin during local development
    // headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins for local testing
    // headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    // headers.set('Access-Control-Allow-Headers', '*'); // Allow all headers

    headers.set('Content-Type', 'text/plain;charset=UTF-8');

    return new Response(content, {
      status: 200, // HTTP status code 200 OK
      headers: headers,
    });

  } catch (error) {
    console.error(`Error retrieving full content "${uuid}" from DB:`, error);
    return new Response('Internal Server Error: Failed to retrieve content.', { status: 500 });
  }
});

// --- WebSocket Endpoint for Status Updates (New) ---
// This route handles the WebSocket upgrade and sends status updates by polling the DB.
// This is a simplified approach for demonstration. A push-based system from the background
// worker would be more efficient in production.
analyze.get('/:taskId', async (c) => {
  const taskId = c.req.param('taskId');
  const upgradeHeader = c.req.header('Upgrade');

  if (upgradeHeader !== 'websocket') {
      return c.text('Expected Upgrade: websocket', 426);
  }

  const db = drizzle(c.env.DB, { schema });

  // Check if the task exists
  const existingTask = await db.select()
      .from(schema.resources)
      .where(eq(schema.resources.uuid, taskId))
      .limit(1)
      .get();

  if (!existingTask) {
      console.warn(`WebSocket connection attempted for non-existent task ID: ${taskId}`);
      return c.text('Task not found', 404);
  }

  const isYoutube = isYouTubeLinkRegex(existingTask.content);

  // Handle the WebSocket upgrade using new WebSocketPair()
  const { 0: client, 1: server } = new WebSocketPair();

  // Accept the WebSocket connection
  server.accept();

  console.log(`WebSocket connection accepted for task ID: ${taskId}`);

  // --- Polling Logic ---
  // Poll the database periodically for task status updates
  let lastStatus = existingTask.status; // Keep track of the last status sent
  const examType = existingTask.exam_type;
  let pollingInterval = null;

  const alreadyScraped = new Set();

  const startPolling = () => {
      pollingInterval = setInterval(async () => {
          try {
              const task = await db.select()
                  .from(schema.resources)
                  .where(eq(schema.resources.uuid, taskId))
                  .limit(1)
                  .get();

              if (!task) {
                  console.error(`Task ID ${taskId} disappeared from DB during polling.`);
                  // Send a failed status and close WS
                  if (server.readyState === WebSocket.OPEN) {
                       server.send(JSON.stringify({
                           id: taskId,
                           status: 'failed',
                           error: 'Task disappeared from database.',
                       }));
                  }
                  clearInterval(pollingInterval);
                  server.close(1011, 'Task disappeared'); // 1011: Internal Error
                  return;
              }

              if (isYoutube && (task.status !== 'completed' && task.status !== 'failed')) {
                  const scraperResult = await pollingStatusFromScraper(c, taskId)
                  console.log(`scraperResult ${JSON.stringify(scraperResult)}`)
                  if (scraperResult) {
                      // 返回了mp3和字幕，需要再次调用获得最终结果
                      if (scraperResult.status == 'success') {
                          // 获取字幕，然后调用ai获取结果
                          if (!alreadyScraped.has(existingTask.uuid)) {
                            alreadyScraped.add(existingTask.uuid)
                            await getAudioFromScraperThenExtractWords(c, db, existingTask, examType);                            
                            await getSrtFromScraperThenExtractWords(c, db, existingTask, examType);
                          } else {
                            console.log(`Task has already scraped: ${existingTask.uuid}`);  
                          }

                          // // 成功
                          // await db.update(schema.resources)
                          //     .set({
                          //         status: 'completed',
                          //         result: JSON.stringify(candidates), // Store result as JSON string
                          //         updated_at: sql`CURRENT_TIMESTAMP`
                          //     })
                          //     .where(eq(schema.resources.uuid, taskId));
                      } else if (scraperResult.status == 'failed') {
                          // 成功
                          await db.update(schema.resources)
                              .set({
                                  status: 'failed',
                                  // result: JSON.stringify(candidates), // Store result as JSON string
                                  updated_at: sql`CURRENT_TIMESTAMP`
                              })
                              .where(eq(schema.resources.uuid, taskId));
                      }
                  }
              }

              // Send status update if status has changed or if it's the final status
              if (task.status !== lastStatus || task.status === 'completed' || task.status === 'failed') {
                  lastStatus = task.status; // Update last sent status

                  const update = {
                      id: task.uuid,
                      status: task.status,
                      // Include progress and message if your background process updates them in the DB
                      // progress: task.progress, // Example
                      // message: task.message, // Example
                  };

                  if (task.status === 'completed') {
                      // Include the result if completed
                      update.result = { uuid: task.uuid, words: JSON.parse(task.result) };

                        const existingAttachments = await db.select({
                            audio_key: schema.attachments.audio_key,
                            caption_srt: schema.attachments.caption_srt
                        })
                        .from(schema.attachments)
                        .where(eq(schema.attachments.resource_id, task.id))
                        .limit(1); // We only need to find one match

                        if (existingAttachments.length > 0) {
                            const audio_key = existingAttachments[0].audio_key;
                            const caption_srt = existingAttachments[0].caption_srt;
                            if (audio_key) {
                                update.result['audioKey'] = !!audio_key
                            }
                            if (caption_srt) {
                                update.result['captionSrt'] = !!caption_srt
                            }
                        }

                      console.log(`Sending completed status for task ID ${taskId}.`);
                  } else if (task.status === 'failed') {
                      // Include the error if failed
                      update.error = task.error;
                      console.log(`Sending failed status for task ID ${taskId}.`);
                  } else {
                       console.log(`Sending status update for task ID ${taskId}: ${task.status}`);
                  }

                  if (server.readyState === WebSocket.OPEN) {
                      server.send(JSON.stringify(update));
                  } else {
                       console.warn(`WebSocket not open for sending status update for task ID ${taskId}.`);
                       clearInterval(pollingInterval); // Stop polling if WS is not open
                  }

                  // If task is completed or failed, stop polling and close the WebSocket
                  if (task.status === 'completed' || task.status === 'failed') {
                      clearInterval(pollingInterval);
                       pollingInterval = null;
                      server.close(); // Close WS gracefully
                  }
              }

          } catch (pollError) {
              console.error(`Error during database polling for task ID ${taskId}:`, pollError);
              // Send a failed status and close WS on polling error
               if (server.readyState === WebSocket.OPEN) {
                   server.send(JSON.stringify({
                       id: taskId,
                       status: 'failed',
                       error: 'Error fetching task status.',
                   }));
              }
              clearInterval(pollingInterval);
              pollingInterval = null;
              server.close(1011, 'Polling error'); // 1011: Internal Error
          }
      }, 5000); // Poll every 5 seconds (adjust as needed)
  };

  // Start polling immediately after the connection is accepted
  startPolling();

  // --- WebSocket Event Listeners ---
  server.addEventListener('message', event => {
      // This WebSocket is primarily for sending status updates from backend to frontend.
      // If the frontend needs to send messages (e.g., cancel), you'd handle them here.
      console.log(`Received message from client for task ID ${taskId}:`, event.data);
      // Example: Handle a cancel message
      // try {
      //     const message = JSON.parse(event.data);
      //     if (message.action === 'cancel') {
      //         console.log(`Cancel action requested for task ID: ${taskId}`);
      //         // TODO: Implement task cancellation logic in the backend
      //         // This would typically involve updating the task status to 'failed' or 'canceling' in the DB
      //         // The polling logic would then pick up this status change.
      //     }
      // } catch (parseError) {
      //     console.error(`Failed to parse client message for task ID ${taskId}:`, parseError);
      // }
  });

  server.addEventListener('close', event => {
      console.log(`WebSocket connection closed for task ID ${taskId}. Code: ${event.code}, Reason: ${event.reason}`);
      // Clear the polling interval when the WebSocket closes
      if (pollingInterval !== null) {
          clearInterval(pollingInterval);
           pollingInterval = null;
      }
  });

  server.addEventListener('error', event => {
      console.error(`WebSocket error for task ID ${taskId}:`, event);
      // The 'close' event usually follows an 'error' event, cleanup is handled there.
  });

  // Return the client side of the WebSocketPair as the response
  return new Response(null, {
      status: 101, // Switching Protocols
      webSocket: client,
  });
});

// --- Simulation of Background Analysis Task (For Demonstration) ---
// In a real application, this logic would be in a separate background worker
// that is triggered by the /api/analyze endpoint.
const simulateAnalysisTask = async (c, taskId, db, analysisData) => {
  console.log(`[SIMULATION] Starting analysis simulation for task ID: ${taskId}`);

  // // Check if the task exists
  // const existingTask = await db.select()
  //     .from(schema.resources)
  //     .where(eq(schema.resources.uuid, taskId))
  //     .limit(1)
  //     .get();

  // if (!existingTask) {
  //   console.warn(`simulateAnalysisTask attempted for non-existent task ID: ${taskId}`);
  // } else {
  //   console.log(`simulateAnalysisTask attempted for task ID: ${taskId}`);
  // }

  // // 这里无法获取到当前用户
  // const user = c.get('user');

  let userId = null;
  // // 限流检查
  let hasFreeQuota = false;
  // --- 2. 检查和消费免费额度 ---
  try {
    const resources = await db.select({
      user_id: schema.resources.user_id
    })
    .from(schema.resources)
    .where(eq(schema.resources.uuid, taskId))
    .limit(1);
    if (resources.length > 0) {
      userId = resources[0].user_id;
      hasFreeQuota = await checkAndConsumeFreeQuota(c, userId);      
    }
  } catch (error) {
    console.error(error.message);
    // checkAndConsumeFreeQuota 内部已经抛出了 HTTPException
    return c.json({ message: error.message }, 400);
  }

  let candidates = await extractWordsByAi(c, userId, analysisData, hasFreeQuota);
  if (!candidates || candidates.length === 0) {
    await db.update(schema.resources)
    .set({
        status: 'failed',
        error: candidates === false ? 'Invalid llm config.' : 'Extract words failed.',
        updated_at: sql`CURRENT_TIMESTAMP`
    })
    .where(eq(schema.resources.uuid, taskId));
    return null;
  }

  // 去重
  const uniqueElements = new Set(candidates);
  candidates = Array.from(uniqueElements);

  let values = {
          status: 'completed',
          result: JSON.stringify(candidates), // Store result as JSON string
          updated_at: sql`CURRENT_TIMESTAMP`
      };
  if ('title' in analysisData) {
    values.title = analysisData.title;
  }
  // 成功
  await db.update(schema.resources)
      .set(values)
      .where(eq(schema.resources.uuid, taskId));

  return candidates;
};

export default analyze;
