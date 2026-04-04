import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import { sql, eq, and, desc, getTableColumns, like } from 'drizzle-orm';
import { generateSalt, hashPassword, verifyPassword, bufferToHex, hexToBuffer } from '../utils/passwords';
import { log2WordViews } from '../utils/dbUtils';

const profile = new Hono();

// Endpoint to get user's word view history
profile.get('/view-history', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const db = drizzle(c.env.DB, { schema });
  const { page = '1', limit = '20', query = '' } = c.req.query();
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    const { id: wordId, ...restWordColumns } = getTableColumns(schema.words);

    // Base query conditions
    const conditions = [eq(schema.word_views.user_id, user.id)];
    if (query) {
      conditions.push(like(schema.words.word_text, `%${query}%`));
    }

    const historyRecords = await db
      .select({
        id: schema.word_views.id, // Use the view's ID as the primary key for the row
        wordId: schema.words.id, // Keep the word's ID as wordId
        viewedAt: schema.word_views.created_at,
        ...restWordColumns
      })
      .from(schema.word_views)
      .leftJoin(schema.words, eq(schema.word_views.word_id, schema.words.id))
      .where(and(...conditions))
      .orderBy(desc(schema.word_views.created_at))
      .limit(limitNum)
      .offset(offset);

    const totalResult = await db.select({ count: sql`count(*)` }).from(schema.word_views)
      .leftJoin(schema.words, eq(schema.word_views.word_id, schema.words.id))
      .where(and(...conditions));
      
    const total = totalResult[0].count;

    return c.json({
      data: historyRecords,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    }, 200);

  } catch (error) {
    console.error("Failed to fetch word view history:", error);
    return c.json({ message: 'Failed to fetch history.' }, 500);
  }
});

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

profile.post('/change-password', async (c) => {
  const user = c.get('user');
  if (!user || !user.id) {
    return c.json({ message: 'Unauthorized: User not found in session.' }, 401);
  }

  const { currentPassword, newPassword, confirmPassword } = await c.req.json();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return c.json({ message: 'All password fields are required.' }, 400);
  }

  if (newPassword !== confirmPassword) {
    return c.json({ message: 'New password and confirmation do not match.' }, 400);
  }

  if (newPassword.length < 6) { // Example validation
    return c.json({ message: 'New password must be at least 6 characters long.' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });

  try {
    // 1. Fetch the current user from the database
    const existingUser = await db.select({
        password: schema.users.password,
        salt: schema.users.salt
      })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);

    if (existingUser.length === 0) {
      return c.json({ message: 'User not found in database.' }, 404);
    }

    const storedUserData = existingUser[0];

    // 2. Verify the current password
    const salt = hexToBuffer(storedUserData.salt);
    const isPasswordValid = await verifyPassword(currentPassword, storedUserData.password, salt);

    if (!isPasswordValid) {
      return c.json({ message: 'Incorrect current password.' }, 403);
    }

    // 3. Hash the new password
    const newSalt = generateSalt();
    const newHashedPassword = await hashPassword(newPassword, newSalt);
    const newSaltHex = bufferToHex(newSalt);

    // 4. Update the password in the database
    await db.update(schema.users)
      .set({
        password: newHashedPassword,
        salt: newSaltHex,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(schema.users.id, user.id));

    return c.json({ message: 'Password updated successfully.' }, 200);

  } catch (error) {
    console.error("Failed to change password:", error);
    return c.json({ message: 'An internal error occurred while changing the password.' }, 500);
  }
});

// Endpoint to log a word view
profile.post('/log-view', async (c) => {
  const user = c.get('user');
  if (!user) {
    // Even if it's a fire-and-forget, we can return early if no user.
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const { wordId } = await c.req.json();
  if (!wordId || typeof wordId !== 'number') {
    return c.json({ message: 'Invalid wordId provided.' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });

  // Use waitUntil to not block the client and ensure the log is written
  c.executionCtx.waitUntil(log2WordViews(db, user.id, wordId));

  // Respond immediately to the client
  return c.json({ message: 'Log received.' }, 202); 
});


export default profile;
