import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
// The schema object itself is usually defined in a separate file and imported for drizzle initialization
import * as schema from '../db/schema'; // Keep schema import for drizzle initialization
import { sql, eq, and, desc } from 'drizzle-orm'; // Import sql tag for raw SQL fragments like RANDOM() and LIKE

const llm = new Hono();

llm.get('/list', async (c) => {
  const user = c.get('user');
  if (!user) {
    // return c.json({ message: 'Forbidden' }, 403);
    return c.json([], 200); // Return 200 OK for existing
  }

  const db = drizzle(c.env.DB, { schema });
  const userId = user.id; // Placeholder for public user or replace with actual user ID
  
  try {
      const existingLlms = await db.select({
          id: schema.llms.id,
          platform: schema.llms.platform,
          endpoint: schema.llms.endpoint,
          token: schema.llms.token, 
          model: schema.llms.model,
          active: schema.llms.active,
      })
      .from(schema.llms)
      .where(eq(schema.llms.user_id, userId));

      if (existingLlms.length > 0) {
        console.log(`Existing llm found with length: ${existingLlms.length}`);
        return c.json(existingLlms, 200); // Return 200 OK for existing
      }

      return c.json([], 200); // Return 200 OK for existing      
  } catch (checkError) {
      console.error("Failed to check for listing llms in DB:", checkError);
      // Continue to insert if checking fails, or return an error depending on desired behavior
      // For now, let's return an error if the check itself failed
      return c.json({ message: 'Failed to listing llms.' }, 500);
  }

});

llm.post('/save', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
  }
  
  const db = drizzle(c.env.DB, { schema });
  let requestData;

  // 1. Validate input
  try {
      requestData = await c.req.json();
      // TODO: Add more robust validation using Zod or similar
      if (!requestData || !requestData.platform || typeof requestData.platform !== 'string') {
          return c.json({ message: 'Invalid llm data provided.' }, 400);
      }
      //  // Basic enum checks (should align with requestData interface)
      const validPlatforms = ['deepseek', 'gemini', 'openai', 'doubao', 'jimeng', 'seedream', 'dreamina', 'scraper'];
      // //  const validExamTypes = ['托福', 'GRE', 'TOEIC', 'SAT', '6级'];
      // //  if (!validSourceTypes.includes(requestData.sourceType) || !validExamTypes.includes(requestData.examType)) {
      if (!validPlatforms.includes(requestData.platform)) {
        return c.json({ message: 'Invalid platform value.' }, 400);
      }

  } catch (e) {
      console.error("Failed to parse analysis request body:", e);
      return c.json({ message: 'Invalid JSON body' }, 400);
  }

  // TODO: Get authenticated user ID (replace with actual auth logic)
  const userId = user.id; // Placeholder for public user or replace with actual user ID

  // 3. Check if a record with the same exam_type and content_md5 already exists
  try {
      const existingLlms = await db.select({
        id: schema.llms.id,
      })
      .from(schema.llms)
      .where(and(eq(schema.llms.platform, requestData.platform), eq(schema.llms.user_id, userId)))
      .limit(1); // We only need to find one match

      if (existingLlms.length > 0) {
        // 更新
        await db.update(schema.llms)
            .set({
              endpoint: requestData.endpoint,
              token: requestData.token,
              model: requestData.model,
              active: requestData.active,
            })
            .where(eq(schema.llms.id, existingLlms[0].id));
      } else {
        // 插入
        await db.insert(schema.llms).values({
            user_id: userId,
            platform: requestData.platform,
            endpoint: requestData.endpoint,
            token: requestData.token,
            model: requestData.model,
            active: requestData.active,
        });        
      }

      if (requestData.endpoint) {
        const llmKey = `llm-${requestData.platform}-${userId}`
        const llmDataKv = {
          endpoint: requestData.endpoint,
          token: requestData.token,
          model: requestData.model,
          active: requestData.active,
        }
        await c.env.WORDBENTO_KV.put(llmKey, JSON.stringify(llmDataKv));
      }

      return c.json({}, 200); // 201 Created

  } catch (checkError) {
      console.error("Failed to update llm in DB:", checkError);
      // Continue to insert if checking fails, or return an error depending on desired behavior
      // For now, let's return an error if the check itself failed
      return c.json({ message: 'Failed to update llm.' }, 500);
  }
});

export default llm;
