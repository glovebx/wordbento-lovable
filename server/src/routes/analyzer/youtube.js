import * as schema from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { extractTextFromSrt } from '../../utils/languageParser';
import { simulateAnalysisTask } from './service';

export const extractWordsByScraper = async (c, url) => {
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

export const pollingStatusFromScraper = async (c, taskId) => {
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

export const getSrtFromScraperThenExtractWords = async (c, db, task, examType) => {
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

export const getAudioFromScraperThenExtractWords = async (c, db, task, examType) => {
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

export const isYouTubeLinkRegex = function(url) {
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
