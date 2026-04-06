
import * as schema from '../../db/schema';
import { sql, eq } from 'drizzle-orm';
import { checkAndConsumeFreeQuota } from '../../utils/security';
import { extractWordsByAi } from './ai';

// --- Simulation of Background Analysis Task (For Demonstration) ---
// In a real application, this logic would be in a separate background worker
// that is triggered by the /api/analyze endpoint.
export const simulateAnalysisTask = async (c, taskId, db, analysisData) => {
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
