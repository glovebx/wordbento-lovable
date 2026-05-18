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
  // 这是管理员，不检查调用额度
    if (userId === 1) return true;

    const USER_CALLS_LIMIT = c.env.USER_CALLS_LIMIT || 100;
    const FREE_CALLS_LIMIT = c.env.FREE_CALLS_LIMIT || 10;
    const TTL_SECONDS = c.env.TTL_SECONDS || 60 * 60 * 24; // 24小时
    const kv = c.env.WORDBENTO_KV;
    let key;
    let limit;

    if (userId) {
        key = `${USER_KEY_PREFIX}-${userId}`;
        // Potentially different limit for logged-in users
        limit = USER_CALLS_LIMIT;
    } else {
        const requestIp = c.req.header('CF-Connecting-IP');
        if (!requestIp) {
            console.warn("CF-Connecting-IP header missing. Using placeholder IP for quota check.");
        }
        const ip = requestIp || '127.0.0.1_dev';
        key = `${IP_KEY_PREFIX}-${ip}`;
        limit = FREE_CALLS_LIMIT;
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

/**
 * Represents the configuration for an LLM.
 */
class LlmConfig {
  constructor(platform, endpoint, apiKey, model) {
    this.platform = platform;
    this.endpoint = endpoint || '';
    this.apiKey = apiKey || '';
    this.model = model || '';
  }

  isValid() {
    console.log(this.endpoint, this.apiKey)
    // return !!this.endpoint && !!this.apiKey && !!this.model;
    return !!this.endpoint && !!this.apiKey;
  }

  toObject() {
    return {
      platform: this.platform,
      endpoint: this.endpoint,
      apiKey: this.apiKey,
      model: this.model,
    };
  }
}

/**
 * Base class for configuration providers.
 */
class LlmConfigProvider {
  constructor(c, platform) {
    this.c = c;
    this.platform = platform;
  }

  async getConfig() {
    throw new Error("GetConfig method must be implemented by subclasses.");
  }
}

/**
 * Provides LLM config for authenticated users, with KV caching.
 */
class UserConfigProvider extends LlmConfigProvider {
  constructor(c, platform, userId) {
    super(c, platform);
    this.userId = userId;
    this.db = drizzle(c.env.DB, { schema });
    this.kv = c.env.WORDBENTO_KV;
    this.cacheKey = `llm-${platform}-${userId}`;
  }

  async #getFromCache() {
    try {
      const cachedData = await this.kv.get(this.cacheKey, { type: 'json' });
      if (cachedData && cachedData.endpoint) {
        console.log(`Cache HIT for user ${this.userId}`);
        return new LlmConfig(this.platform, cachedData.endpoint, cachedData.token, cachedData.model);
      }
    } catch (error) {
      console.error(`KV get failed for key ${this.cacheKey}:`, error.message);
    }
    return null;
  }

  async #getFromDatabase() {
    const results = await this.db.select()
      .from(schema.llms)
      .where(and(eq(schema.llms.platform, this.platform), eq(schema.llms.user_id, this.userId), eq(schema.llms.active, 1)))
      .limit(1);

    if (results.length > 0) {
      const dbData = results[0];
      console.log(`DB HIT for user ${this.userId}`);
      this.c.executionCtx.waitUntil(this.#updateCache(dbData));
      return new LlmConfig(this.platform, dbData.endpoint, dbData.token, dbData.model);
    }
    
    console.log(`No active LLM config found in DB for user ${this.userId}`);
    return null;
  }

  async #updateCache(data) {
    const cacheData = { endpoint: data.endpoint, token: data.token, model: data.model };
    try {
      await this.kv.put(this.cacheKey, JSON.stringify(cacheData));
      console.log(`Cache SET for user ${this.userId}`);
    } catch (error) {
      console.error(`KV put failed for key ${this.cacheKey}:`, error.message);
    }
  }

  async getConfig() {
    const cachedConfig = await this.#getFromCache();
    if (cachedConfig?.isValid()) return cachedConfig;

    const dbConfig = await this.#getFromDatabase();
    if (dbConfig?.isValid()) return dbConfig;

    return new LlmConfig(this.platform);
  }
}

/**
 * Provides public/free LLM config from environment variables.
 */
class FreeQuotaProvider extends LlmConfigProvider {
  getConfig() {
    const platformUpper = this.platform.toUpperCase();
    const endpoint = this.c.env[`${platformUpper}_API_ENDPOINT`];
    const apiKey = this.c.env[`${platformUpper}_API_KEY`];
    const model = this.c.env[`${platformUpper}_API_MODEL`];
    
    if (endpoint && apiKey) {
        return new LlmConfig(this.platform, endpoint, apiKey, model);
    }
    
    console.log(`No env vars for ${this.platform}, falling back to Deepseek.`);
    return new LlmConfig(
        'deepseek', 
        this.c.env.DEEPSEEK_API_ENDPOINT, 
        this.c.env.DEEPSEEK_API_KEY, 
        this.c.env.DEEPSEEK_API_MODEL
    );
  }
}

export const getLlmConfig = async (c, platform, userId, hasFreeQuota) => {
  let provider;

  if (userId) {
    provider = new UserConfigProvider(c, platform, userId);
  } else if (hasFreeQuota) {
    provider = new FreeQuotaProvider(c, platform);
  } else {
    return new LlmConfig(platform).toObject();
  }

  const config = await provider.getConfig();
  
  if (!config.isValid()) {
      // console.warn(`LLM configuration for platform '${platform}' is invalid or not found.`);
  }

  return config.toObject();
};