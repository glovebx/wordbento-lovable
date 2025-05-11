import { Hono } from 'hono';
// Import necessary Drizzle functions. 'eq' and 'sql' are commonly used.
// Adjust imports based on your Drizzle setup if needed.
// Note: Drizzle ORM can be used with JavaScript, but type safety is lost.
// The 'schema' import is not needed in the JS runtime code itself,
// but the Drizzle client needs to be configured with the schema definition.
// Assuming your Drizzle client is configured elsewhere with the schema.
// For D1 with Drizzle, you typically initialize it like drizzle(env.DB, { schema });
// We'll keep the drizzle import and schema reference in the initialization.
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
// The schema object itself is usually defined in a separate file and imported for drizzle initialization
import * as schema from '../db/schema'; // Keep schema import for drizzle initialization
import { sql } from 'drizzle-orm'; // Import sql tag for raw SQL fragments like RANDOM() and LIKE
import { jsonrepair } from 'jsonrepair';
import { isLikelyJsonString, cleanAiJsonResponse } from './word';

const analyze = new Hono();

// // Placeholder function to call Gemini AI API
// // Replace with your actual API call logic
// // Type annotations removed
// const extractWordsByGeminiAi = async (c, analysisData) => {
//     console.log(`Calling Gemini AI for source: ${analysisData.sourceType}`);
//     // This is a placeholder. You need to replace this with your actual API call.
//     // Example using fetch:
    
//     const GEMINI_API_ENDPOINT = c.env.GEMINI_API_ENDPOINT

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

//         const response = await fetch(GEMINI_API_ENDPOINT, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 // 'Authorization': `Bearer ${GEMINI_API_KEY}`
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

const extractWordsByAi = async (c, analysisData) => {
  console.log(`Calling Gemini AI for source: ${analysisData.sourceType}`);
  // This is a placeholder. You need to replace this with your actual API call.
  // Example using fetch:
  
  const GEMINI_API_ENDPOINT = c.env.GEMINI_API_ENDPOINT
  const GEMINI_API_KEY = c.env.GEMINI_API_KEY
  const GEMINI_API_MODEL = c.env.GEMINI_API_MODEL

  try {
    const prompt = analysisData.sourceType === 'article' ? `
我给你一篇文章，请从中将${analysisData.examType}等级的单词筛选出来，请仅以json格式的数组返回，不要包含任何其他文本或解释。
文章如下：${analysisData.content}
              ` : `我给你一个url，请访问阅读其中的正文，从中将${analysisData.examType}等级的单词筛选出来，请仅以json格式的数组返回，不要包含任何其他文本或解释。。
URL如下：${analysisData.content}`;


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
      console.log(messageContent);

      const jsonStr = cleanAiJsonResponse(messageContent)

      const repairedStr = jsonrepair(jsonStr)
      console.log(repairedStr);

      const jsonWord = JSON.parse(repairedStr);

      // Validate the structure of the received data if necessary
      return jsonWord;

  } catch (error) {
      console.error('Network error calling Gemini AI API:', error);
      return null;
  }
};


// --- Analysis Task Submission Route (New) ---
analyze.post('/', async (c) => {
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
  const userId = 0; // Placeholder for public user or replace with actual user ID

  // 2. Create a new task in the database
  const taskId = crypto.randomUUID(); // Generate a unique task ID
  try {
      await db.insert(schema.resources).values({
          user_id: userId,
          source_type: analysisData.sourceType,
          content: analysisData.content,
          exam_type: analysisData.examType,
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

      // For this example, we'll simulate the task completion in a few seconds
      // In a real app, the background process would do this.
      await simulateAnalysisTask(c, taskId, db, analysisData); // Call simulation function

      // 4. Return the task ID to the client
      return c.json({ uuid: taskId }, 201); // 201 Created

  } catch (dbError) {
      console.error("Failed to create analysis task in DB:", dbError);
      return c.json({ message: 'Failed to initiate analysis task.' }, 500);
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

  // Handle the WebSocket upgrade using new WebSocketPair()
  const { 0: client, 1: server } = new WebSocketPair();

  // Accept the WebSocket connection
  server.accept();

  console.log(`WebSocket connection accepted for task ID: ${taskId}`);

  // --- Polling Logic ---
  // Poll the database periodically for task status updates
  let lastStatus = existingTask.status; // Keep track of the last status sent
  let pollingInterval = null;

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
                      update.result = { words: JSON.parse(task.result) };
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
      }, 2000); // Poll every 2 seconds (adjust as needed)
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

  const candidates = await extractWordsByAi(c, analysisData);
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

  // 成功
  await db.update(schema.resources)
      .set({
          status: 'completed',
          result: JSON.stringify(candidates), // Store result as JSON string
          updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(schema.resources.uuid, taskId));

  return candidates;
};

export default analyze;
