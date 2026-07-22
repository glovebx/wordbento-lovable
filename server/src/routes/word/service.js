
import { and, eq, inArray, gt, gte, lt, lte, isNull, asc, desc, sql as dsql, notInArray } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { isQuoted, removeQuotes } from '../../utils/languageParser';
import LanguageUtils from '../../utils/languageUtils';
import { compressImageBufferWithPronunciation } from '../../utils/imageUtils'; // Import the new image utility
import { generateImageByAi, generatePushImageByAi } from './ai';
import { checkAndConsumeFreeQuota } from '../../utils/security';
import { NavigationMode } from '../../utils/constants';
import { generateWordCard } from '../../utils/aiService';
import { formatDbResultToWordResponse } from '../../utils/dbUtils';

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
    // 如果userId有效，则从word_views中获得最后一个word_id
    let lastViewedWordId = null;
    if (userId) {
        let query = db.select({ word_id: schema.word_views.word_id })
            .from(schema.word_views);

        if (mustHaveImage) {
            query = query.innerJoin(schema.images, eq(schema.word_views.word_id, schema.images.word_id));
        }

        if (userId) {
            query = query.where(and(eq(schema.word_views.user_id, userId), sql`NOT EXISTS (SELECT 1 FROM ${schema.archives} WHERE ${schema.archives.word_id} = ${schema.word_views.word_id} AND ${schema.archives.user_id} = ${userId})`));
        } else {
            query = query.where(eq(schema.word_views.user_id, userId));
        }

        const lastViewedResult = await query
            .orderBy(desc(schema.word_views.id))
            .limit(1);
        lastViewedWordId = lastViewedResult[0]?.word_id;
    } 

    if (!lastViewedWordId) {
        // 1. Get the max ID from the words table.
        const maxIdResult = await db.select({ value: dsql`max(${schema.words.id})` }).from(schema.words);
        const maxId = maxIdResult[0].value;
        // // 应该不存在吧？
        // if (!maxId) return null;

        // for (let i = 0; i < 10; i++) { // Try up to 10 times to find a word
        // 2. Pick a random ID between 1 and maxId.
        lastViewedWordId = Math.floor(Math.random() * maxId) - 1;
    }

    // 3. Find the first word with an ID >= randomId that meets the criteria.
    let query = db.select({ id: schema.words.id })
        .from(schema.words)
        .where(gte(schema.words.id, lastViewedWordId));

    if (mustHaveImage) {
        query.innerJoin(schema.images, eq(schema.words.id, schema.images.word_id));
    }

    const word = await query.orderBy(asc(schema.words.id)).limit(1);

    // 在 mustHaveImage = true 时，这里可能找不到符合条件的单词（恰好该单词还未生成图片时）
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

    const wordId = currentResult[0].id;

    const condition = mode === NavigationMode.Next
        ? gt(schema.words.id, wordId)
        : lt(schema.words.id, wordId);

    let query = db.select({ id: schema.words.id })
        .from(schema.words);

    if (mustHaveImage) {
        query = query.innerJoin(schema.images, eq(schema.words.id, schema.images.word_id));
    }
    // 这里必须过滤已经掌握的单词
    if (userId) {
        query = query.where(and(condition, sql`NOT EXISTS (SELECT 1 FROM ${schema.archives} WHERE ${schema.archives.word_id} = ${schema.words.id} AND ${schema.archives.user_id} = ${userId})`));
    } else {
        query = query.where(condition);
    }

    query = query.orderBy(
        mode === NavigationMode.Next ? asc(schema.words.id) : desc(schema.words.id));
    query = query.limit(1);

    // console.log('query ==>', query.toSQL());

    const nextIdResult = await query;
    if (nextIdResult.length > 0) {
        const nextId = nextIdResult[0].id || wordId;
        // 4. Once we have a valid ID, fetch the full aggregated data.
        return getAggregatedWord(db, eq(schema.words.id, nextId));
    } else {
        let nextId;
        if (mode === NavigationMode.Next) {
            // // 从头开始
            // const minIdResult = await db.select({ value: dsql`min(${schema.words.id})` }).from(schema.words);
            // nextId = minIdResult[0].value;
            // 仍旧返回当前单词，告知用户已经到最后一个单词了
            nextId = wordId
        } else {
            // 最后一个单词
            const maxIdResult = await db.select({ value: dsql`max(${schema.words.id})` }).from(schema.words);
            nextId = maxIdResult[0].value;
        }
        return getAggregatedWord(db, eq(schema.words.id, nextId));
    }
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
        // console.log(`Searching for word: ${searchSlug} with mode: ${mode}`);
        if (mode !== NavigationMode.Search) {
            // 翻页，带上是否已经掌握的标志
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
        // console.log(`No valid slug provided for search.`);
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
        const wordData = formatDbResultToWordResponse(c, userId, wordDetails.word, wordDetails.contentRecords, wordDetails.imageRecords);
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

    // // 字典里是否存在这个单词
    // const dictResult = await db.select({
    //     exists: sql`EXISTS (SELECT 1 FROM dictionary WHERE word = ${searchSlug})`
    // });

    // // 手动转换类型
    // const exists = Boolean(dictResult[0]?.exists);

    // if (!exists) {
    //     // 单词不存在，说明用户输入非法，直接返回
    //     console.log(`Word "${searchSlug}" not found in dictionary.`);
    //     return c.json({ message: `Word "${searchSlug}" not exists in dictionary.` }, 200);
    // } else {
    //     // 单词存在，调用AI生成
    //     console.log(`Word "${searchSlug}" found in dictionary, calling AI to generate...`);
    // }

    const newWordData = await generateWordCard(c, db, userId, searchSlug);

    if (newWordData) {
        return c.json(newWordData, 201);
    } else {
        return c.json({ message: `Failed to save generated data for "${searchSlug}".` }, 200);
    }

};

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


const getWordDetails = async (c, userId, db, word) => {
    const [contentRecords, imageRecords] = await Promise.all([
        db.select().from(schema.word_content).where(eq(schema.word_content.word_id, word.id)),
        db.select().from(schema.images).where(eq(schema.images.word_id, word.id)),
    ]);
    return formatDbResultToWordResponse(c, userId, word, contentRecords, imageRecords);
};

export const generateWordImage = async (c, db, userId, slug, example, force) => {
    if (!slug) throw new Error('Slug is required.');

    const wordToGenerate = slug.trim().toLowerCase();
    const existingWord = await db.select().from(schema.words).where(eq(schema.words.word_text, wordToGenerate)).limit(1);
    if (existingWord.length === 0) return null;

    if (!force) {
        // 非强制，先找到既存的图片
        const existImages = await db.select({ image_key: schema.images.image_key })
        .from(schema.images)
        .where(eq(schema.images.word_id, existingWord[0].id));
        if (existImages.length > 0) {
            return existImages.map(img => `${c.env.VITE_IMG_URL}/${img.image_key}`);
        }
    }

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
        if (force) {
            const imageRecords = await db.select({ image_key: schema.images.image_key }).from(schema.images).where(eq(schema.images.word_id, existingWord[0].id));
            for (const record of imageRecords) {
                await c.env.WORDBENTO_R2.delete(record.image_key);
            }
            await db.delete(schema.images).where(eq(schema.images.word_id, existingWord[0].id));
        }

        const allImageResults = await readImageBinaryStreams(imageUrls);
        const savedImageUrls = await Promise.all(allImageResults.filter(img => img.data).map(async (imageBinaryData) => {
            const objectKey = `${nanoid(10)}.jpeg`;
            const compressedData = await compressImageBufferWithPronunciation(imageBinaryData.data, existingWord[0].phonetic);
            await c.env.WORDBENTO_R2.put(objectKey, compressedData, { contentType: 'image/jpeg' });
            await db.insert(schema.images).values({ word_id: existingWord[0].id, image_key: objectKey, prompt: example.trim() });
            return `${c.env.VITE_IMG_URL}/${objectKey}`;
        }));
        return savedImageUrls;
    }
    return [];
};

// 替换或者追加客户端编辑后的图片，只有admin能操作
export const addOrReplaceWordImage = async (c, db, userId, imageData, dataUrl, redact, replace = false) => {
    let objectKey = imageData.image_key;
    if (replace) {
        // 删除R2中的实际文件
        await c.env.WORDBENTO_R2.delete(imageData.image_key);
        // // 删除DB中的记录
        // await db.delete(schema.images).where(eq(schema.images.id, imageData.id));
    } else {
        objectKey = `${nanoid(10)}.jpeg`;
    }

    // 将 dataUrl 转换为buffer，供compressImageBufferWithPronunciation使用
    const base64Data = dataUrl.split(',')[1];
    const imageBinaryData = Buffer.from(base64Data, 'base64');

    let phonetic = null;
    if (redact) {
        // 从word表中获取音标
        const [wordData] = await db.select().from(schema.words).where(eq(schema.words.id, imageData.word_id)).limit(1);
        if (wordData) {
            phonetic = wordData.phonetic;
        }
    }

    const compressedData = await compressImageBufferWithPronunciation(imageBinaryData, phonetic);
    await c.env.WORDBENTO_R2.put(objectKey, compressedData, { contentType: 'image/jpeg' });
    if (!replace) {
        // 如果是替换就不要重复插入
        await db.insert(schema.images).values({ word_id: imageData.word_id, image_key: objectKey, prompt: imageData.prompt });
    }

    try {
        // Step 1: Set is_cover = 0 for all images of this word
        await db.update(schema.images)
        .set({ is_cover: 0 })
        .where(and(eq(schema.images.word_id, imageData.word_id), eq(schema.images.is_cover, 1)));

        // Step 2: Set is_cover = 1 for the specific image
        await db.update(schema.images)
        .set({ is_cover: 1 })
        .where(and(
            eq(schema.images.word_id, imageData.word_id),
            eq(schema.images.image_key, objectKey),
        ));

        return c.json({ message: 'Cover image updated successfully.' }, 200);
    } catch (error) {
        console.error('Error updating cover image:', error);
    }

    // 获取所有图片URL
    const allImageRecords = await db.select({ image_key: schema.images.image_key }).from(schema.images).where(eq(schema.images.word_id, imageData.word_id));
    return allImageRecords.map(img => `${c.env.VITE_IMG_URL}/${img.image_key}`);
};

// 删除图片，只有admin能操作
export const deleteWordImage = async (c, db, userId, imageData) => {
    // 删除R2中的实际文件
    await c.env.WORDBENTO_R2.delete(imageData.image_key);
    // 删除image的数据
    await db.delete(schema.images).where(eq(schema.images.id, imageData.id));
    // 获取所有图片URL
    const allImageRecords = await db.select({ image_key: schema.images.image_key }).from(schema.images).where(eq(schema.images.word_id, imageData.word_id));
    return allImageRecords.map(img => `${c.env.VITE_IMG_URL}/${img.image_key}`);
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

export const getReviewWords4Push = async (c, db, userId, words) => {
    let wordsForPush = words;

    if (!wordsForPush || wordsForPush.length === 0) {
        // Fallback to fetching recent words if none are provided
        const recentWords = await db.select({
            word_text: schema.words.word_text
        })
        .from(schema.word_views)
        .innerJoin(schema.words, eq(schema.word_views.word_id, schema.words.id))
        .where(eq(schema.word_views.user_id, userId))
        .groupBy(schema.words.id, schema.words.word_text)
        .orderBy(desc(sql`MAX(${schema.word_views.id})`))
        .limit(10);
        wordsForPush = recentWords.map(w => w.word_text);
    }

    if (!wordsForPush || wordsForPush.length === 0) {
        // No words found, return empty
        return [];
    }

    let hasFreeQuota = false;
    try {
        hasFreeQuota = await checkAndConsumeFreeQuota(c, userId);
    } catch (error) {
        console.error(error.message);
        throw error;
    }

    const language = LanguageUtils.detectLanguage(wordsForPush.join(', '));
    const imageUrls = await generatePushImageByAi(c, userId, wordsForPush, language, hasFreeQuota);

    // We map this to an array of strings as requested.
    return imageUrls;
};

export const getTodayWords = async (c, db, userId, maxViewsId) => {
    // const start = new Date();
    // 这种做法是错误的，start.setHours(0, 0, 0, 0) 和 end.setHours(23, 59, 59, 999) 操作的是本地时间（Worker 运行在 Cloudflare 的边缘节点上，时区不一定是 UTC）。
    // start.setHours(0, 0, 0, 0);
    // const end = new Date();
    // end.setHours(23, 59, 59, 999);

    // const startStr = toSqliteUtcString(start);
    // const endStr = toSqliteUtcString(end);

    // 第1种做法
    // const now = new Date();
    // const year = now.getFullYear();
    // const month = now.getMonth();
    // const date = now.getDate();
    // const start = new Date(Date.UTC(year, month, date, 0, 0, 0));
    // const end = new Date(Date.UTC(year, month, date, 23, 59, 59));

    // // Date.UTC 创建的 Date，toISOString() 就是 UTC 时间
    // const startStr = start.toISOString().slice(0, 19).replace('T', ' ');  // "2026-07-09 00:00:00"
    // const endStr = end.toISOString().slice(0, 19).replace('T', ' ');      // "2026-07-09 23:59:59"    

    // 第2种做法
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const date = String(now.getUTCDate()).padStart(2, '0');
    const startStr = `${year}-${month}-${date} 00:00:00`;
    const endStr = `${year}-${month}-${date} 23:59:59`;

    console.log('startStr', startStr)
    console.log('endStr', endStr)

    const wordViews = await db.select({ id: schema.word_views.id, word_id: schema.word_views.word_id })
        .from(schema.word_views)
        .where(and(eq(schema.word_views.user_id, userId), gt(schema.word_views.id, parseInt(maxViewsId)), gte(schema.word_views.created_at, startStr), lte(schema.word_views.created_at, endStr)))
        .orderBy(desc(schema.word_views.id))
        .limit(100);

    const wordIds = [...new Set(wordViews.map(v => v.word_id))];
    if (wordIds.length === 0) {
        return { data: [], totalCount: 0 };
    }

    const words = await db.select().from(schema.words).where(inArray(schema.words.id, wordIds));
    const successfulWords = await Promise.all(words.map(async (word) => {
        const details = await getWordDetails(c, userId, db, word);
        return { ...details, text: `${details.word_text}\n\n${details.phonetic}` };
    }));

    return {
        data: successfulWords,
        latestViewsId: Math.max(...wordViews.map(v => v.id)),
        totalCount: wordIds.length,
    };
};

export const getSequenceWords = async (c, userId, db, limit, maxWordsId) => {
    const words = await db.select().from(schema.words).where(gt(schema.words.id, parseInt(maxWordsId))).limit(limit);
    if (words.length === 0) {
        return { data: [], totalCount: 0 };
    }

    const successfulWords = await Promise.all(words.map(async (word) => {
        const details = await getWordDetails(c, userId, db, word);
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


