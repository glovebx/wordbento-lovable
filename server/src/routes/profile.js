import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
// The schema object itself is usually defined in a separate file and imported for drizzle initialization
import * as schema from '../db/schema'; // Keep schema import for drizzle initialization
import { sql, eq, and, desc } from 'drizzle-orm'; // Import sql tag for raw SQL fragments like RANDOM() and LIKE

const profile = new Hono();

profile.get('/token/get', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json([], 200);
  }

  const db = drizzle(c.env.DB, { schema });
  const userId = user.id; // Placeholder for public user or replace with actual user ID
  
  try {
    const existingUsers = await db.select({
      access_token: schema.users.access_token
    })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (existingUsers.length > 0) {
      return c.json({access_token: existingUsers[0].access_token}, 200);
    } 

    return c.json({ message: 'Invalid user.' }, 409);
  } catch (checkError) {
      console.error("Failed to get access token from DB:", checkError);
      // Continue to insert if checking fails, or return an error depending on desired behavior
      // For now, let's return an error if the check itself failed
      return c.json({ message: 'Failed to get access token.' }, 500);
  }
});

profile.post('/token/renew', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
  }
  
  const db = drizzle(c.env.DB, { schema });
  let requestData;

  // 1. Validate input
  try {
      requestData = await c.req.json();
  } catch (e) {
      console.error("Failed to parse request body:", e);
      return c.json({ message: 'Invalid JSON body' }, 400);
  }

  // Function to generate a UUID using the Web Crypto API
  const randomUUID = () => crypto.randomUUID();

  // TODO: Get authenticated user ID (replace with actual auth logic)
  const userId = user.id; // Placeholder for public user or replace with actual user ID

  // 3. Check if a record with the same exam_type and content_md5 already exists
  try {
    // 删除旧数据
    // Check if the user already exists in the database
    const existingUsers = await db.select({
      access_token: schema.users.access_token
    })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (existingUsers.length == 0) {
      return c.json({ message: 'Invalid user.' }, 409);
    }
    if (existingUsers[0].access_token) {
      // Delete the session from the KV store
      await c.env.WORDBENTO_KV.delete(existingUsers[0].access_token);
    }

    const accessToken = randomUUID();
    // 更新
    await db.update(schema.users)
        .set({
          access_token: accessToken,
          updated_at: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(schema.users.id, userId));

    // 放入kv
    await c.env.WORDBENTO_KV.put(accessToken, JSON.stringify(user));

    return c.json({}, 200);

  } catch (checkError) {
      console.error("Failed to update access token in DB:", checkError);
      // Continue to insert if checking fails, or return an error depending on desired behavior
      // For now, let's return an error if the check itself failed
      return c.json({ message: 'Failed to update access token.' }, 500);
  }
});

export default profile;
