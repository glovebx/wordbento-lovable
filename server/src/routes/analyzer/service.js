
import * as schema from '../../db/schema';
import { sql, eq, inArray } from 'drizzle-orm';
import { checkAndConsumeFreeQuota } from '../../utils/security';
import { extractWordsByAi } from './ai';
import { generateCoverImageByAi } from '../word/ai'
import LanguageUtils from '../../utils/languageUtils';

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

export const getRelatedResources = async (db, resourceId) => {
    const results = await db.select({
        id: schema.resources.id,
        content: schema.resources.content,
        attachment_title: schema.attachments.title,
        thumbnail: schema.attachments.thumbnail,
        position: schema.related_resources.position,
    })
    .from(schema.related_resources)
    .leftJoin(schema.resources, eq(schema.related_resources.related_resource_id, schema.resources.id))
    .leftJoin(schema.attachments, eq(schema.related_resources.related_resource_id, schema.attachments.resource_id))
    .where(eq(schema.related_resources.resource_id, resourceId))
    .orderBy(schema.related_resources.position);

    return results.map(row => ({
        id: row.id,
        content: row.attachment_title || row.content,
        thumbnail: row.thumbnail,
    }));
};

export const updateRelatedResources = async (db, resourceId, relatedIds) => {
      // 1. Delete existing relations for the main resource
      await db.delete(schema.related_resources)
          .where(eq(schema.related_resources.resource_id, resourceId));

      // 根据relatedIds从resources表中获取uuid列表，必须按relatedIds的顺序
      // 否则在更新resources表的related_uuids时，顺序会被打乱
      const results = await db.select({
        id: schema.resources.id,
        uuid: schema.resources.uuid,
      })
      .from(schema.resources)
      .where(inArray(schema.resources.id, relatedIds))

      // 建立一个 Map 方便查找：id -> uuid
      const uuidMap = new Map(results.map(r => [r.id, r.uuid]));

      // 按 relatedIds 的原顺序提取 uuid
      const relatedUuids = relatedIds
        .map(id => uuidMap.get(id))
        .filter(uuid => uuid !== undefined);  // 防止某些 ID 未找到

      console.log('relatedIds', relatedIds);
      console.log('relatedUuids', relatedUuids);

      // 3. Update related_uuids in resources table
      await db.update(schema.resources)
          .set({
              related_uuids: relatedUuids.join(','),
          })
          .where(inArray(schema.resources.id, relatedIds));

      // 2. If there are new IDs, insert them
      if (relatedIds && relatedIds.length > 0) {
          const valuesToInsert = relatedIds.map((id, index) => ({
              resource_id: resourceId,
              related_resource_id: id,
              position: index,
          }));
          await db.insert(schema.related_resources).values(valuesToInsert);
      }
};

export const getResourcesByIds = async (db, ids) => {
    if (!ids || ids.length === 0) {
        return [];
    }

    const results = await db.select({
        id: schema.resources.id,
        title: schema.resources.title,
        content: schema.resources.content,
        attachment_title: schema.attachments.title,
        thumbnail: schema.attachments.thumbnail,
    })
    .from(schema.resources)
    .leftJoin(schema.attachments, eq(schema.resources.id, schema.attachments.resource_id))
    .where(inArray(schema.resources.id, ids));

    // Create a map for efficient lookup
    const resultsMap = new Map(results.map(row => [row.id, {
        ...row,
        title: row.attachment_title || row.title || row.content,
    }]));

    // Return results in the same order as the original IDs
    return ids.map(id => resultsMap.get(id)).filter(Boolean);
};

export const getCoverImageByTitle = async (c, db, userId, title) => {
    if (!title) {
        return [];
    }

    let hasFreeQuota = false;
    try {
        hasFreeQuota = await checkAndConsumeFreeQuota(c, userId);
    } catch (error) {
        console.error(error.message);
        throw error;
    }

    const language = LanguageUtils.detectLanguage(title.join(', '));
    const imageUrls = await generateCoverImageByAi(c, userId, title, language, hasFreeQuota);

    // We map this to an array of strings as requested.
    return imageUrls;
};