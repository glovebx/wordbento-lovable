// 导入 HTTPException 用于抛出 HTTP 错误
import { HTTPException } from 'hono/http-exception';

// 定义AI请求免费额度和过期时间（例如：24小时）
const FREE_CALLS_LIMIT = 3;
const TTL_SECONDS = 60 * 60 * 24; // 24小时
const IP_KEY_PREFIX = 'quota-ip';

/**
 * 检查 IP 地址的免费调用额度，并根据结果更新 KV 或抛出异常。
 * * @param c Hono Context 对象
 * @param ip 请求的 IP 地址
 * @param user 已登录的用户对象 (或 null)
 */
export const checkAndConsumeFreeQuota = async (c, user) => {
    // 限流检查
    // --- 1. 获取请求 IP 地址 ---
    // Cloudflare Workers/Pages Functions 会在请求头中注入 'CF-Connecting-IP'
    const requestIp = c.req.header('CF-Connecting-IP'); 
    // 如果无法获取 IP (例如在本地开发环境)，使用一个默认值
    if (!requestIp) {
        console.warn("CF-Connecting-IP header missing. Using placeholder IP for quota check.");
    }
    const ip = requestIp || '127.0.0.1_dev';
      
    const kv = c.env.WORDBENTO_KV;
    const ipKey = `${IP_KEY_PREFIX}-${ip}`;

    // 1. 获取当前调用记录
    const quotaData = await kv.get(ipKey, { type: 'json' });
    let currentCount = quotaData ? quotaData.count : 0;

    if (currentCount > FREE_CALLS_LIMIT) {
        // 额度已用完

        // // 检查用户是否已登录
        if (!user) {
            // 未登录，抛出需要登录的异常 (HTTP 401 Unauthorized)
            throw new HTTPException(401, {
                message: "您已用完24小时内的免费调用额度。请登录以获得更多使用机会。",
                status: 401
            });
        }

        // // 已登录，但仍然额度用尽，提示使用自己的 API Key
        // // 在实际应用中，这里可能还会检查用户是否有付费套餐等
        // throw new HTTPException(402, { // 402 Payment Required 比较合适
        //     message: "免费额度已用完 (3/3)。请在'个人资料'页面填写您自己的 Gemini API Key 以继续使用。",
        //     status: 402
        // });
        return false;

    } else {
        // 2. 额度未用完，递增计数并更新 KV
        currentCount += 1;
        const newData = { count: currentCount, expires: Date.now() + (TTL_SECONDS * 1000) };
        
        // 使用 put 方法更新 KV，并设置 TTL
        await kv.put(ipKey, JSON.stringify(newData), { expirationTtl: TTL_SECONDS });
        console.log(`IP ${ip} consumed quota: ${currentCount}/${FREE_CALLS_LIMIT}`);
        
        // 如果是最后一次免费调用，给用户一个 Toast 提示
        if (currentCount === FREE_CALLS_LIMIT) {
             console.log(`IP ${ip} reached limit.`);
             // 注意：这里无法直接在后端抛出 Toast，需要通过 HTTP 响应头或体通知前端
             // 在实际项目中，您可能需要返回一个特定的响应码或在响应体中包含状态信息
        }
        return true;
    }
}