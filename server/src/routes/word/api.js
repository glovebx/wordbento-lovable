
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { and, eq, inArray, gt, lt, gte, lte, isNull, asc, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  searchWord, 
  generateWordImage, 
  markWordAsMastered, 
  getTodayWords, 
  getSequenceWords
} from './service';
import { NavigationMode } from '../../utils/constants';

const word = new Hono();

word.post('/search', async (c) => {
  if (!c.req.header('Content-Type')?.includes('application/json')) {
    return c.json({ message: 'Invalid Content-Type, expected application/json' }, 415);
  }

  let slug;
  let mode = NavigationMode.Search;
  let mustHaveImage;
  try {
    const body = await c.req.json();
    slug = body.slug;
    mode = body.mode || NavigationMode.Search;
    mustHaveImage = !!body.mhi;
  } catch (e) {
    console.error("Failed to parse request body:", e);
    return c.json({ message: 'Invalid JSON body' }, 400);
  }

  if (typeof mode !== 'number' || !NavigationMode.ValidValues.includes(mode)) {
    console.warn(`Invalid navigation mode received: ${mode}`);
    return c.json({ message: 'Invalid navigation mode provided.' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });
  const user = c.get('user');
  const userId = user ? user.id : null;

  try {
    const response = await searchWord(c, db, userId, slug, mode, mustHaveImage);
    return response;
  } catch (error) {
    console.error("Error in word search or generation:", error);
    return c.json({ message: 'An error occurred.' }, 500);
  }
});

word.post('/imagize', async (c) => {
  if (!c.req.header('Content-Type')?.includes('application/json')) {
    return c.json({ message: 'Invalid Content-Type, expected application/json' }, 415);
  }

  const user = c.get('user');
  const userId = user ? user.id : null;

  let slug;
  let example;
  let force = false;
  try {
    const body = await c.req.json();
    slug = body.slug;
    example = body.example || '';
    force = body.force;
  } catch (e) {
    console.error("Failed to parse request body:", e);
    return c.json({ message: 'Invalid JSON body' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });

  try {
    const imageUrls = await generateWordImage(c, db, userId, slug, example, force);
    if (imageUrls && imageUrls.length > 0) {
      return c.json({ imageUrls }, 200);
    } else {
      return c.json({ message: `Failed to generate image for "${slug}".` }, 500);
    }
  } catch (error) {
    console.error("Error in image generation:", error);
    return c.json({ message: 'An error occurred during image generation.' }, 500);
  }
});

word.get('/image/:key', async (c) => {
  const objectKey = c.req.param('key');
  if (!objectKey) {
    return new Response('Bad Request: Missing object key.', { status: 400 });
  }

  try {
    const object = await c.env.WORDBENTO_R2.get(objectKey);
    if (object === null) {
      return new Response('Not Found', { status: 404 });
    }

    const headers = new Headers(object.httpMetadata);
    headers.set('ETag', object.etag);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');

    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    console.error(`Error retrieving image "${objectKey}" from R2:`, error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

word.put('/master/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
  }

  const wordId = parseInt(c.req.param('id'), 10);
  if (isNaN(wordId) || wordId <= 0) {
    return c.json({ message: 'Invalid word ID.' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });

  try {
    await markWordAsMastered(db, user.id, wordId);
    return c.json({ message: 'Word marked as mastered.' }, 200);
  } catch (error) {
    console.error("Error marking word as mastered:", error);
    return c.json({ message: 'Failed to mark word as mastered.' }, 500);
  }
});

word.post('/today', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ message: 'Forbidden' }, 403);
    }

    let maxViewsId = 0;
    try {
        const body = await c.req.json();
        maxViewsId = body.maxId;
    } catch (e) {
        return c.json({ message: 'Invalid JSON body' }, 400);
    }

    const db = drizzle(c.env.DB, { schema });

    try {
        const result = await getTodayWords(c, db, user.id, maxViewsId);
        return c.json(result, 200);
    } catch (error) {
        console.error("Failed to get today's words:", error);
        return c.json({ message: 'Failed to get today\'s words.' }, 500);
    }
});

word.post('/sequence', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ message: 'Forbidden' }, 403);
    }

    let limit = 1;
    let maxWordsId = 0;
    try {
        const body = await c.req.json();
        maxWordsId = body.maxId || 0;
        limit = parseInt(body.limit || 1);
    } catch (e) {
        return c.json({ message: 'Invalid JSON body' }, 400);
    }

    const db = drizzle(c.env.DB, { schema });

    try {
        const result = await getSequenceWords(c, db, limit, maxWordsId);
        return c.json(result, 200);
    } catch (error) {
        console.error("Failed to get sequence words:", error);
        return c.json({ message: 'Failed to get sequence words.' }, 500);
    }
});

export default word;
