import { nanoid } from 'nanoid';

// This is an in-memory queue. In a real-world scalable application, you'd replace this
// with a more robust solution like Cloudflare Queues, RabbitMQ, or Redis.

const taskQueue = [];
const activeConnections = new Map(); // Stores WebSocket connections by taskId
let isProcessing = false;

// Store a global reference to the context and db instance
let globalDb = null;

const processQueue = async () => {
    if (isProcessing) return;
    isProcessing = true;

    while (taskQueue.length > 0) {
        const task = taskQueue.shift();
    

        if (!globalDb) {
            console.error('[taskQueue] processQueue: global db not initialized!');
            // Optionally, re-queue the task or handle the error appropriately
            continue; // Skip to the next iteration
        }

        try {
            const { generateWordCard } = await import('./aiService.js');
            const minimalContext = { env: task.env, get: (key) => key === 'user' ? task.user : undefined };
            const result = await generateWordCard(minimalContext, globalDb, task.userId, task.word);

            const ws = activeConnections.get(task.id);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ status: 'completed', data: result }));
                ws.close();
            }
        } catch (error) {
            console.error(`Error processing task ${task.id}:`, error);
            const ws = activeConnections.get(task.id);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ status: 'failed', error: error.message }));
                ws.close();
            }
        } finally {
            activeConnections.delete(task.id);
        }
    }

    isProcessing = false;
};

export const addTask = (task, c, db) => {
    if (!globalDb) {
        globalDb = db;
    }

    const taskId = nanoid();
    // Instead of storing the whole context, store only what's needed.
    const newTask = {
        id: taskId,
        ...task,
        env: c.env,
        user: c.get('user'),
    };
    taskQueue.push(newTask);



    processQueue();

    return {
        taskId,
        status: 'pending',
        queuePosition: taskQueue.length - 1,
    };
};

export const registerWebSocket = (taskId, ws) => {
    activeConnections.set(taskId, ws);
    console.log(`WebSocket registered for task ${taskId}`);

    ws.on('close', () => {
        activeConnections.delete(taskId);
        console.log(`WebSocket for task ${taskId} closed and removed.`);
    });
};
