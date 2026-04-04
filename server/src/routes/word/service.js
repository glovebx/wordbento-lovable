
import { and, eq, inArray, gt, gte, lt, lte, isNull, asc, desc, sql as dsql, notInArray } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { Jimp } from 'jimp';
import { isQuoted, removeQuotes } from '../../utils/languageParser';
import LanguageUtils from '../../utils/languageUtils';
import { toSqliteUtcString } from '../../utils/dateUtils';
import { generateImageByAi } from './ai';
import { checkAndConsumeFreeQuota } from '../../utils/security';
import { NavigationMode } from '../../utils/constants';
import { generateWordCard } from '../../utils/aiService';
import { formatDbResultToWordResponse, log2WordViews } from '../../utils/dbUtils';

/**
 * 应用归档过滤（排除已归档的单词）
 */
function applyArchiveFilter(query, userId) {
  if (userId) {
    return query.where(isNull(schema.archives.word_id));
  }
  return query;
}

/**
 * 构建查询 words 表的基础条件（包含 mustHaveImage 和 userId 归档过滤）
 * @param db Drizzle 数据库实例
 * @param fields 要查询的字段
 * @param userId 用户 ID（可选）
 * @param mustHaveImage 是否必须关联图片
 * @returns 一个未执行的查询构建器
 */
/**
 * Builds and executes a query to get a word and all its related content and images in a single DB call.
 * @returns {Promise<object|null>} Aggregated word details or null.
 */
async function getAggregatedWord(db, whereClause) {
  console.log('whereClause', whereClause)
    const rows = await db
        .select({
            word: schema.words,
            word_content: schema.word_content,
            images: schema.images,
        })
        .from(schema.words)
        .leftJoin(schema.word_content, eq(schema.words.id, schema.word_content.word_id))
        .leftJoin(schema.images, eq(schema.words.id, schema.images.word_id))
        .where(whereClause)
        .orderBy(schema.words.id); // Important for consistent aggregation

    return aggregateWordDetails(rows);
}

async function findRandomAggregatedWord(db, userId, mustHaveImage) {
    // 1. Get the max ID from the words table.
    const maxIdResult = await db.select({ value: dsql`max(${schema.words.id})` }).from(schema.words);
    const maxId = maxIdResult[0].value;
    if (!maxId) return null;

    // for (let i = 0; i < 10; i++) { // Try up to 10 times to find a word
        // 2. Pick a random ID between 1 and maxId.
        const randomId = Math.floor(Math.random() * maxId) - 1;

        // 3. Find the first word with an ID >= randomId that meets the criteria.
        let query = db.select({ id: schema.words.id })
            .from(schema.words)
            .where(gte(schema.words.id, randomId));

        if (mustHaveImage) {
            query.innerJoin(schema.images, eq(schema.words.id, schema.images.word_id));
        }
        // if (userId) {
        //     const subquery = db.select({ word_id: schema.archives.word_id }).from(schema.archives).where(eq(schema.archives.user_id, userId));
        //     query.where(notInArray(schema.words.id, subquery));
        // }

        const word = await query.orderBy(asc(schema.words.id)).limit(1);

        if (word.length > 0) {
            // 4. Once we have a valid ID, fetch the full aggregated data.
            return getAggregatedWord(db, eq(schema.words.id, word[0].id));
        }
    // }

    // If we couldn't find a word after 10 tries, return null.
    console.log("Could not find a random word after 10 attempts.");
    return null;
}

async function getAdjacentWord(db, slug, mode, userId, mustHaveImage) {
    const currentResult = await db.select({ id: schema.words.id })
        .from(schema.words)
        .where(eq(schema.words.word_text, slug))
        .limit(1);

    const wordId =  currentResult[0].id;

  const condition = mode === NavigationMode.Next
    ? gt(schema.words.id, wordId)
    : lt(schema.words.id, wordId);

  let query = db.select({ id: schema.words.id })
    .from(schema.words)
    .where(condition);

  if (mustHaveImage) {
      query.innerJoin(schema.images, eq(schema.words.id, schema.images.word_id));
  }    

  // query = applyArchiveFilter(query, userId);
  query = query.orderBy(mode === NavigationMode.Next ? asc(schema.words.id) : desc(schema.words.id));
  query = query.limit(1);  

    const nextIdResult = await query;
    if (nextIdResult.length > 0) {
      const nextId = nextIdResult[0].id || wordId;
      // 4. Once we have a valid ID, fetch the full aggregated data.
      return getAggregatedWord(db, eq(schema.words.id, nextId));
    }

    return null;
}

async function getPrefixWordId(db, slug, userId) {
    const prefix = slug + '%';
    const result = await db.select({ id: schema.words.id })
        .from(schema.words)
        .where(sql`${schema.words.word_text} LIKE ${prefix}`)
        .limit(1);
    if (result.length > 0) {
      return result[0].id;
    }
    return null;
}

/**
 * 处理 slug 字符串：去除引号，判断是否为引号包裹
 */
function processSlug(slug) {
  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    return { isQuoted: false, cleanSlug: '' };
  }
  const trimmed = slug.trim().toLowerCase();
  const quoted = isQuoted(trimmed);
  const clean = quoted ? removeQuotes(trimmed) : trimmed;
  return { isQuoted: quoted, cleanSlug: clean };
}

// ==================== 主函数重构 ====================

export const searchWord = async (c, db, userId, slug, mode, mustHaveImage) => {
  const { isQuoted: isSlugQuoted, cleanSlug: searchSlug } = processSlug(slug);

  let wordDetails = null;

  if (searchSlug) {
    if (mode !== NavigationMode.Search) {
        // 翻页
        wordDetails = await getAdjacentWord(db, searchSlug, mode, userId, mustHaveImage);
    } else {
        wordDetails = await getAggregatedWord(db, eq(schema.words.word_text, searchSlug));
        if (!wordDetails && !isSlugQuoted) {
            // This part is tricky with aggregation. A simple LIKE might fetch multiple words and mix their details.
            // For simplicity and performance, we'll fetch the ID first, then get the full details.
            const prefixId = await getPrefixWordId(db, searchSlug, userId);
            if (prefixId) {
                wordDetails = await getAggregatedWord(db, eq(schema.words.id, prefixId));
            }
        }
    }
  } else {
    wordDetails = await findRandomAggregatedWord(db, userId, mustHaveImage);
  }

//   if (mode !== NavigationMode.Search && wordDetails) {
//       // Navigation logic (Next/Prev) still needs a separate query for simplicity.
//       const adjacentWord = await getAdjacentWord(db, wordDetails.word.id, mode, userId, mustHaveImage);
//       if (adjacentWord) {
//           wordDetails = await getAggregatedWord(db, eq(schema.words.id, adjacentWord.id));
//       }
//   }

  if (wordDetails) {
    const wordData = formatDbResultToWordResponse(c, wordDetails.word, wordDetails.contentRecords, wordDetails.imageRecords);
    c.executionCtx.waitUntil(log2WordViews(db, userId, wordDetails.word.id));
    return c.json(wordData, 200);
  }

  // 4. 未找到单词的情况
  if (mode !== NavigationMode.Search || mustHaveImage) {
    // 如果是在翻页模式或必须带图片，没有更多数据
    return c.json({}, 200);
  }

  // 如果执行到这里，说明是搜索模式，且数据库没有，需要调用AI生成
  if (!searchSlug) {
    return c.json({ message: 'Cannot generate data for empty slug.' }, 400);
  }

  const newWordData = await generateWordCard(c, db, userId, searchSlug);

  if (newWordData) {
    return c.json(newWordData, 201);
  } else {
    return c.json({ message: `Failed to save generated data for "${searchSlug}".` }, 200);
  }

};

const MAX_IMAGE_SIZE = 200 * 1024; // 200KB

async function compressImageBuffer(buffer) {
    if (buffer.byteLength <= MAX_IMAGE_SIZE) {
        return buffer; // No need to compress
    }

    try {
        console.log(`Image size (${(buffer.byteLength / 1024).toFixed(2)} KB) exceeds limit, attempting to compress...`);
        const image = await Jimp.read(buffer);
        let quality = 90;
        let lastCompressedBuffer = null;

        for (let q = quality; q >= 10; q -= 10) {
            const compressedBuffer = await image.quality(q).getBufferAsync(Jimp.MIME_JPEG);
            lastCompressedBuffer = compressedBuffer;
            console.log(`  - Trying quality ${q}, size: ${(compressedBuffer.length / 1024).toFixed(2)} KB`);

            if (compressedBuffer.length <= MAX_IMAGE_SIZE) {
                console.log(`  - Compression successful.`);
                return compressedBuffer;
            }
        }

        if (lastCompressedBuffer) {
            console.log(`  - [Warning] Could not compress below target size. Using last compressed result.`);
            return lastCompressedBuffer;
        }

    } catch (error) {
        console.error("Image compression with Jimp failed:", error);
    }

    return buffer; // Fallback, Return original buffer on failure
}

/**
 * Takes a flat array of results from a JOIN query and aggregates them
 * into a single word object with nested content and images.
 */
function aggregateWordDetails(rows) {
    if (!rows || rows.length === 0) {
        return null;
    }

    const { word } = rows[0];
    if (!word) {
        return null;
    }

    const contentRecords = [];
    const imageRecords = [];
    const seenContentIds = new Set();
    const seenImageIds = new Set();

    rows.forEach(row => {
        if (row.word_content && !seenContentIds.has(row.word_content.id)) {
            contentRecords.push(row.word_content);
            seenContentIds.add(row.word_content.id);
        }
        if (row.images && !seenImageIds.has(row.images.id)) {
            imageRecords.push(row.images);
            seenImageIds.add(row.images.id);
        }
    });

    return { word, contentRecords, imageRecords };
}


const getWordDetails = async (c, db, word) => {
  const [contentRecords, imageRecords] = await Promise.all([
    db.select().from(schema.word_content).where(eq(schema.word_content.word_id, word.id)),
    db.select().from(schema.images).where(eq(schema.images.word_id, word.id)),
  ]);
  return formatDbResultToWordResponse(c, word, contentRecords, imageRecords);
};



export const generateWordImage = async (c, db, userId, slug, example, force) => {
    if (!slug) return null;

    const wordToGenerate = slug.trim().toLowerCase();
    const existingWord = await db.select().from(schema.words).where(eq(schema.words.word_text, wordToGenerate)).limit(1);
    if (existingWord.length === 0) return null;

    if (!example) {
        const examples = await db.select({ content: schema.word_content.content })
            .from(schema.word_content)
            .where(and(eq(schema.word_content.language_code, "en"), eq(schema.word_content.content_type, "examples"), eq(schema.word_content.word_id, existingWord[0].id)))
            .limit(1);
        if (examples.length > 0) {
            try {
                const jsonExamples = JSON.parse(examples[0].content);
                example = jsonExamples[0];
            } catch (error) {
                console.error("Error parsing examples from DB:", error);
            }
        }
    }

    let hasFreeQuota = false;
    try {
        hasFreeQuota = await checkAndConsumeFreeQuota(c, userId);
    } catch (error) {
        console.error(error.message);
        throw error;
    }

    const language = LanguageUtils.detectLanguage(wordToGenerate);
    const imageUrls = await generateImageByAi(c, userId, wordToGenerate, existingWord[0].phonetic, example.trim(), language, hasFreeQuota);

    if (imageUrls && imageUrls.length > 0) {
        const allImageResults = await readImageBinaryStreams(imageUrls);
        if (force) {
            const imageRecords = await db.select({ image_key: schema.images.image_key }).from(schema.images).where(eq(schema.images.word_id, existingWord[0].id));
            for (const record of imageRecords) {
                await c.env.WORDBENTO_R2.delete(record.image_key);
            }
            await db.delete(schema.images).where(eq(schema.images.word_id, existingWord[0].id));
        }

        const savedImageUrls = await Promise.all(allImageResults.filter(img => img.data).map(async (imageBinaryData) => {
            const objectKey = `${nanoid(10)}.jpeg`;
            const compressedData = await compressImageBuffer(imageBinaryData.data);
            await c.env.WORDBENTO_R2.put(objectKey, compressedData, { contentType: 'image/jpeg' });
            await db.insert(schema.images).values({ word_id: existingWord[0].id, image_key: objectKey, prompt: example.trim() });
            return `${c.env.VITE_IMG_URL}/${objectKey}`;
        }));
        return savedImageUrls;
    }
    return null;
};

export const markWordAsMastered = async (db, userId, wordId) => {
    const existingWord = await db.select().from(schema.words).where(eq(schema.words.id, wordId));
    if (existingWord.length === 0) {
        throw new Error("Word not found");
    }

    const existingArchive = await db.select().from(schema.archives).where(and(eq(schema.archives.user_id, userId), eq(schema.archives.word_id, wordId)));
    if (existingArchive.length > 0) {
        return;
    }

    await db.insert(schema.archives).values({ user_id: userId, word_id: wordId });
};

export const getTodayWords = async (c, db, userId, maxViewsId) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const startStr = toSqliteUtcString(start);
    const endStr = toSqliteUtcString(end);

    const wordViews = await db.select({ id: schema.word_views.id, word_id: schema.word_views.word_id })
        .from(schema.word_views)
        .where(and(eq(schema.word_views.user_id, userId), gt(schema.word_views.id, parseInt(maxViewsId)), gte(schema.word_views.created_at, startStr), lte(schema.word_views.created_at, endStr)))
        .orderBy(desc(schema.word_views.id))
        .limit(50);

    const wordIds = [...new Set(wordViews.map(v => v.word_id))];
    if (wordIds.length === 0) {
        return { data: [], totalCount: 0 };
    }

    const words = await db.select().from(schema.words).where(inArray(schema.words.id, wordIds));
    const successfulWords = await Promise.all(words.map(async (word) => {
        const details = await getWordDetails(c, db, word);
        return { ...details, text: `${details.word_text}\n\n${details.phonetic}` };
    }));

    return {
        data: successfulWords,
        latestViewsId: Math.max(...wordViews.map(v => v.id)),
        totalCount: wordIds.length,
    };
};

export const getSequenceWords = async (c, db, limit, maxWordsId) => {
    const words = await db.select().from(schema.words).where(gt(schema.words.id, parseInt(maxWordsId))).limit(limit);
    if (words.length === 0) {
        return { data: [], totalCount: 0 };
    }

    const successfulWords = await Promise.all(words.map(async (word) => {
        const details = await getWordDetails(c, db, word);
        return { ...details, text: `${details.word_text} ${details.phonetic}` };
    }));

    return {
        data: successfulWords,
        latestWordId: Math.max(...words.map(w => w.id)),
        totalCount: words.length,
    };
};



const readImageBinaryStreams = async (imageUrls) => {
    const promises = imageUrls.map(async (url) => {
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) {
                return { url, error: `HTTP error: ${response.status}` };
            }
            const data = await response.arrayBuffer();
            return { url, data };
        } catch (error) {
            return { url, error: error.message };
        }
    });
    return Promise.all(promises);
};
