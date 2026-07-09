
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { and, eq, inArray, gt, lt, gte, lte, isNull, asc, desc } from 'drizzle-orm';
import {
  searchWord, 
  generateWordImage, 
  markWordAsMastered, 
  getTodayWords, 
  getSequenceWords,
  getReviewWords4Push
} from './service';
import { NavigationMode } from '../../utils/constants';
import { HTTPException } from 'hono/http-exception';

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
    if (error instanceof HTTPException) {
      throw error;
    }
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
    if (!imageUrls) {
      // 说明字典中单词不存在
      return c.json({ message: `Word "${slug}" not found in dictionary.` }, 404);
    } else if (imageUrls.length > 0) {
      return c.json({ imageUrls }, 200);
    } else {
      return c.json({ message: `Failed to generate image for "${slug}".` }, 500);
    }
  } catch (error) {
    console.error("Error in image generation:", error);
    if (error instanceof HTTPException) {
      throw error;
    }    
    return c.json({ message: 'An error occurred during image generation.' }, 500);
  }
});

// Set/update cover image
word.post('/cover', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
  }

  const { word_id, image_key } = await c.req.json();
  if (!word_id || !image_key) {
    return c.json({ message: 'word_id and image_key are required.' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });

  try {
    // Step 1: Set is_cover = 0 for all images of this word
    await db.update(schema.images)
      .set({ is_cover: 0 })
      .where(and(eq(schema.images.word_id, word_id), eq(schema.images.is_cover, 1)));

    // Step 2: Set is_cover = 1 for the specific image
    await db.update(schema.images)
      .set({ is_cover: 1 })
      .where(and(
        eq(schema.images.word_id, word_id),
        eq(schema.images.image_key, image_key),
      ));

    return c.json({ message: 'Cover image updated successfully.' }, 200);
  } catch (error) {
    console.error('Error updating cover image:', error);
    return c.json({ message: 'An error occurred while updating cover image.' }, 500);
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

// Save gallery entries to database
word.post('/gallery/save', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
  }

  const { entries } = await c.req.json();
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return c.json({ message: 'entries array is required.' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });

  try {
    const results = [];
    const errors = [];

    for (const entry of entries) {
      const { word_text, image_key, texture_src, background_color, accent_color,
              blob1_color, blob2_color, fallback_color, position_x, position_y } = entry;

      if (!word_text || !image_key) {
        errors.push({ word_text, image_key, error: 'word_text and image_key are required' });
        continue;
      }

      // Find word_id from words table by word_text
      const [word] = await db.select({ id: schema.words.id })
        .from(schema.words)
        .where(eq(schema.words.word_text, word_text))
        .limit(1);

      if (!word) {
        errors.push({ word_text, error: `Word not found in words table` });
        continue;
      }

      // Find image_id from images table by word_id and image_key
      const [image] = await db.select({ id: schema.images.id })
        .from(schema.images)
        .where(and(
          eq(schema.images.word_id, word.id),
          eq(schema.images.image_key, image_key)
        ))
        .limit(1);

      if (!image) {
        errors.push({ word_text, error: `Image "${image_key}" not found` });
        continue;
      }

      // // Delete existing entry for this word_id + image_id (respects UNIQUE constraint)
      // await db.delete(schema.gallery)
      //   .where(and(
      //     eq(schema.gallery.word_id, word.id),
      //     eq(schema.gallery.image_id, image.id)
      //   ));

      // Insert new entry
      await db.insert(schema.gallery).values({
        word_id: word.id,
        image_id: image.id,
        background_color,
        accent_color,
        blob1_color,
        blob2_color,
        fallback_color,
        texture_src: image_key,
        position_x: position_x ?? 0,
        position_y: position_y ?? 0,
      });

      results.push({ word_text, image_key, status: 'saved' });
    }

    return c.json({
      message: 'Gallery saved successfully.',
      saved: results.length,
      errors: errors.length > 0 ? errors : undefined,
    }, errors.length > 0 ? 207 : 200);

  } catch (error) {
    console.error('Error saving gallery:', error);
    return c.json({ message: 'An error occurred while saving gallery.' }, 500);
  }
});

// Get gallery entries (newest first), returns galleryPlaneData.json format
word.get('/gallery/get/:limit', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Forbidden' }, 403);
  }

  const limit = parseInt(c.req.param('limit'), 10);
  const maxIdParam = c.req.query('maxId');
  let maxId = maxIdParam ? parseInt(maxIdParam, 10) : undefined;

  if (isNaN(limit) || limit <= 0) {
    return c.json({ message: 'Invalid limit parameter.' }, 400);
  }

  // if (maxIdParam && (isNaN(maxId) || maxId <= 0)) {
  //   return c.json({ message: 'Invalid maxId parameter.' }, 400);
  // }

  const db = drizzle(c.env.DB, { schema });

  try {
    let query = db.select({
      word_id: schema.gallery.word_id,
      background_color: schema.gallery.background_color,
      accent_color: schema.gallery.accent_color,
      blob1_color: schema.gallery.blob1_color,
      blob2_color: schema.gallery.blob2_color,
      fallback_color: schema.gallery.fallback_color,
      texture_src: schema.gallery.texture_src,
      position_x: schema.gallery.position_x,
      position_y: schema.gallery.position_y,
      word_text: schema.words.word_text,
      phonetic: schema.words.phonetic,
      meaning: schema.words.meaning,
      id: schema.gallery.id, // Include id for next page pagination
    })
      .from(schema.gallery)
      .leftJoin(schema.words, eq(schema.gallery.word_id, schema.words.id));

    if (maxId) {
      query = query.where(lt(schema.gallery.id, maxId));
    }

    const rows = await query.orderBy(desc(schema.gallery.id)).limit(limit);

    // const origin = new URL(c.req.url).origin;
    const result = rows.map(row => ({
      word_id: row.word_id,
      fallbackColor: row.fallback_color,
      accentColor: row.accent_color,
      textureSrc: `/img/${row.texture_src}`,
      position: {
        x: row.position_x,
        y: row.position_y,
      },
      backgroundColor: row.background_color,
      blob1Color: row.blob1_color,
      blob2Color: row.blob2_color,
      label: {
        word: row.word_text || '',
        phonetic: row.phonetic || '',
        meaning: row.meaning || '',
      },
    }));

    const nextMaxId = rows.length > 0 ? rows[rows.length - 1].id : null;

    return c.json({ data: result, nextMaxId }, 200);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    return c.json({ message: 'An error occurred while fetching gallery.' }, 500);
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



// word.get('/slugs', async (c) => {
//   const db = drizzle(c.env.DB, { schema });
//   const { limit = 1000, offset = 0 } = c.req.query();
//   const limitNum = parseInt(limit, 10);
//   const offsetNum = parseInt(offset, 10);

//   try {
//     const allWords = await db.select({ word_text: schema.words.word_text })
//       .from(schema.words)
//       .limit(limitNum)
//       .offset(offsetNum);
      
//     const slugs = allWords.map(w => w.word_text);
//     return c.json(slugs);
//   } catch (error) {
//     console.error("Failed to get all word slugs:", error);
//     return c.json({ message: 'Internal Server Error' }, 500);
//   }
// });

word.post('/review/push', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ message: 'Forbidden' }, 403);
    }

    let words = [];
    // Check if the request has a body and if it's JSON
    if (c.req.header('Content-Type')?.includes('application/json')) {
        try {
            const body = await c.req.json();
            if (body && Array.isArray(body.words)) {
                words = body.words;
            }
        } catch (e) {
            // Ignore parsing error, proceed as if no body was sent
            console.warn('Could not parse JSON body for /review/push, proceeding without words.');
        }
    }

    const db = drizzle(c.env.DB, { schema });

    try {
        const imageUrls = await getReviewWords4Push(c, db, user.id, words);
        if (imageUrls && imageUrls.length > 0) {
          return c.json(imageUrls, 200);
        } else {
          return c.json({ message: `Failed to generate image for e-ink.` }, 500);        
        }
    } catch (error) {
        console.error("Failed to get review words for e-ink:", error);
        return c.json({ message: 'Failed to get review words for e-ink.' }, 500);
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

word.get('/voices', async (c) => {
    try {
        const response = await fetch('https://edge-tts.dayax.net/api/api.php?action=voices');
        if (!response.ok) {
            throw new Error(`Failed to fetch voices from upstream: ${response.status}`);
        }
        const data = await response.json();
        return c.json(data, 200);
    } catch (error) {
        console.error("Error fetching voices:", error);
        return c.json({ message: 'Internal Server Error' }, 500);
    }
});

word.post('/tts', async (c) => {
  // const user = c.get('user');
  // if (!user) {
  //   return c.json({ message: 'Forbidden' }, 403);
  // }

  let text, example, voice, rate, pitch, volume;
  try {
    const body = await c.req.json();
    text = body.text;
    example = body.example || '';
    voice = body.voice || 'en-US-AriaNeural';
    rate = body.rate?.toString() || '0';
    pitch = body.pitch?.toString() || '0';
    volume = body.volume?.toString() || '0';

    if (!text) {
      return c.json({ message: 'Invalid payload. Expected { text: "..." }' }, 400);
    }
  } catch (e) {
    return c.json({ message: 'Invalid JSON body' }, 400);
  }

  try {
    const fullText = `${text}, ${text}, ${example || text}`;
    const payload = {
      text: fullText,
      voice: voice,
      rate: rate,
      volume: volume,
      pitch: pitch,
    };

    const ttsResponse = await fetch('https://edge-tts.dayax.net/api/api.php?action=synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'origin': 'https://edge-tts.dayax.net'
      },
      body: JSON.stringify(payload),
    });

    if (!ttsResponse.ok) {
      throw new Error(`TTS service failed with status ${ttsResponse.status}`);
    }

    const ttsResult = await ttsResponse.json();
    return c.json(ttsResult, 200);

  } catch (error) {
    console.error(`Failed to synthesize speech for text: "${text}"`, error);
    return c.json({ message: 'Internal Server Error' }, 500);
  }
});

export default word;
