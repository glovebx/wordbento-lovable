import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema'; // Keep schema import for drizzle initialization
// 导入 HTTPException 用于抛出 HTTP 错误
import { HTTPException } from 'hono/http-exception';


const IP_KEY_PREFIX = 'quota-ip';
const USER_KEY_PREFIX = 'quota-user';

/**
 * 检查并消费免费调用额度。
 * @param c Hono Context 对象
 * @param userId 已登录的用户ID (或 null)
 */
export const checkAndConsumeFreeQuota = async (c, userId) => {
    const FREE_CALLS_LIMIT = c.env.FREE_CALLS_LIMIT || 3;
    const TTL_SECONDS = c.env.TTL_SECONDS || 60 * 60 * 24; // 24小时
    const kv = c.env.WORDBENTO_KV;
    let key;
    let limit = FREE_CALLS_LIMIT;

    if (userId) {
        key = `${USER_KEY_PREFIX}-${userId}`;
        // Potentially different limit for logged-in users
        limit = c.env.USER_CALLS_LIMIT || 100;
    } else {
        const requestIp = c.req.header('CF-Connecting-IP');
        if (!requestIp) {
            console.warn("CF-Connecting-IP header missing. Using placeholder IP for quota check.");
        }
        const ip = requestIp || '127.0.0.1_dev';
        key = `${IP_KEY_PREFIX}-${ip}`;
    }

    const quotaData = await kv.get(key, { type: 'json' });
    let currentCount = quotaData ? quotaData.count : 0;

    if (currentCount >= limit) {
        if (userId) {
             throw new HTTPException(429, {
                message: "您已用完当日的调用额度。请明天再试。",
            });
        } else {
            throw new HTTPException(401, {
                message: "您已用完24小时内的免费调用额度。请登录以获得更多使用机会。",
            });
        }
    }

    currentCount += 1;
    const newData = { count: currentCount };
    await kv.put(key, JSON.stringify(newData), { expirationTtl: TTL_SECONDS });

    console.log(`Quota consumed for key ${key}: ${currentCount}/${limit}`);

    return true;
}

export const getLlmConfig = async (c, platform, userId, hasFreeQuota) => {
  console.log(`Calling ${platform} AI: ${userId}`);
  
  let AI_API_ENDPOINT = '';
  let AI_API_KEY = '';
  let AI_API_MODEL = '';

  if (userId) {
    const llmKey = `llm-${platform}-${userId}`;
    let llmData = null;
    try {
      llmData = await c.env.WORDBENTO_KV.get(llmKey, { type: 'json' });
    } catch (error) {
      console.error('KV failed:', error.message);      
    }
    if (llmData && llmData.endpoint) {
      // 已登录用户用自己的配置
      AI_API_ENDPOINT = llmData.endpoint;
      AI_API_KEY = llmData.token;
      AI_API_MODEL = llmData.model;
    } else {
      // Initialize Drizzle with schema
      // The schema object needs to be imported and passed here
      const db = drizzle(c.env.DB, { schema });
      // 从数据库中获取
      const existingLlms = await db.select({
        platform: schema.llms.platform,
        endpoint: schema.llms.endpoint,
        token: schema.llms.token,
        model: schema.llms.model,
      })
      .from(schema.llms)
      .where(and(
        eq(schema.llms.platform, platform), 
        eq(schema.llms.user_id, userId),
        eq(schema.llms.active, 1)
      ))
      .limit(1); // We only need to find one match

      if (existingLlms.length > 0) {
        const existingLlm = existingLlms[0];
        console.log(`existingLlm is ${JSON.stringify(existingLlm)}`);

        if (existingLlm.endpoint) {
          const llmKey = `llm-${existingLlm.platform}-${userId}`
          const llmDataKv = {
            endpoint: existingLlm.endpoint,
            token: existingLlm.token,
            model: existingLlm.model,
          }
          await c.env.WORDBENTO_KV.put(llmKey, JSON.stringify(llmDataKv));
        }

        AI_API_ENDPOINT = existingLlm.endpoint;
        AI_API_KEY = existingLlm.token;
        AI_API_MODEL = existingLlm.model;        
      } else {
        console.log('LLM does not Exist or not actived!!!!');
      }
    }
  } else if (hasFreeQuota) {
    if (platform === 'deepseek') {
      AI_API_ENDPOINT = c.env.DEEPSEEK_API_ENDPOINT
      AI_API_KEY = c.env.DEEPSEEK_API_KEY
      AI_API_MODEL = c.env.DEEPSEEK_API_MODEL
    } else {
      AI_API_ENDPOINT = c.env.GEMINI_API_ENDPOINT
      AI_API_KEY = c.env.GEMINI_API_KEY
      AI_API_MODEL = c.env.GEMINI_API_MODEL
    }
  }

  return [platform, AI_API_ENDPOINT, AI_API_KEY, AI_API_MODEL];
}