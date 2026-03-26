
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { isYouTubeLinkRegex, pollingStatusFromScraper, getAudioFromScraperThenExtractWords, getSrtFromScraperThenExtractWords } from './youtube';

export const handleWebSocket = async (c) => {
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
      if (pollingInterval !== null) {
          clearInterval(pollingInterval);
           pollingInterval = null;
      }
      // The 'close' event usually follows an 'error' event, cleanup is handled there.
  });

  // Return the client side of the WebSocketPair as the response
  return new Response(null, {
      status: 101, // Switching Protocols
      webSocket: client,
  });
}
