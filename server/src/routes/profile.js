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

const profile = new Hono();

analyze.post('/gemini/update', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
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
            console.log('45678909876545678');
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
          return c.json(existingResources, 200); // Return 200 OK for existing
      }

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
                  console.log(`scraperResult ${scraperResult}`)
                  if (scraperResult) {
                      // 返回了mp3和字幕，需要再次调用获得最终结果
                      if (scraperResult.status == 'success') {
                          // 获取字幕，然后调用ai获取结果
                          if (!alreadyScraped.has(existingTask.uuid)) {
                              alreadyScraped.add(existingTask.uuid)
                              await getSrtFromScraperThenExtractWords(c, db, existingTask, examType);
                              await getAudioFromScraperThenExtractWords(c, db, existingTask, examType);
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

  let candidates = await extractWordsByAi(c, analysisData);
  if (!candidates || candidates.length === 0) {

    await db.update(schema.resources)
    .set({
        status: 'failed',
        error: 'Extract words failed.',
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
