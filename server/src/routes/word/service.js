
import { and, eq, inArray, gt, lt, gte, lte, isNull, asc, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { isQuoted, removeQuotes } from '../../utils/languageParser';
import LanguageUtils from '../../utils/languageUtils';
import { toSqliteUtcString } from '../../utils/dateUtils';
import { generateBentoByAi, generateImageByAi, repairAiResponseToJson } from './ai';
import { checkAndConsumeFreeQuota } from '../../utils/security';
import { NavigationMode } from '../../utils/constants';


/**
 * 构建查询 words 表的基础条件（包含 mustHaveImage 和 userId 归档过滤）
 * @param db Drizzle 数据库实例
 * @param fields 要查询的字段
 * @param userId 用户 ID（可选）
 * @param mustHaveImage 是否必须关联图片
 * @returns 一个未执行的查询构建器
 */
function buildBaseWordQuery(db, fields, userId, mustHaveImage) {
  let query = db.select(fields).from(schema.words);
  if (mustHaveImage) {
    query = query.innerJoin(schema.images, eq(schema.words.id, schema.images.word_id));
  }
  if (userId) {
    query = query.leftJoin(schema.archives, and(
      eq(schema.words.id, schema.archives.word_id),
      eq(schema.archives.user_id, userId)
    ));
  }
  return query;
}

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
 * 根据 slug 执行精确匹配查询
 */
async function findExactMatch(db, fields, slug, userId, mustHaveImage) {
  let query = buildBaseWordQuery(db, fields, userId, mustHaveImage);
  query = query.where(eq(schema.words.word_text, slug));
  query = query.limit(1);
  const result = await query;
  return result[0] || null;
}

/**
 * 根据 slug 执行前缀匹配查询，可选归档过滤
 */
async function findPrefixMatch(db, fields, slug, userId, mustHaveImage) {
  const prefix = slug + '%';
  let query = buildBaseWordQuery(db, fields, userId, mustHaveImage);
  if (userId) {
    query = applyArchiveFilter(query, userId);
    query = query.where(sql`${schema.words.word_text} LIKE ${prefix}`);
  } else {
    query = query.where(sql`${schema.words.word_text} LIKE ${prefix}`);
  }
  query = query.limit(1);
  const result = await query;
  return result[0] || null;
}

/**
 * 随机获取一个单词，排除已归档（若 userId 提供）
 */
async function findRandomWord(db, fields, userId, mustHaveImage) {
  let query = buildBaseWordQuery(db, fields, userId, mustHaveImage);
  query = applyArchiveFilter(query, userId);
  query = query.orderBy(sql`RANDOM()`).limit(1);
  const result = await query;
  return result[0] || null;
}

/**
 * 获取下一个或上一个单词（基于当前单词 ID，并排除已归档）
 */
async function getAdjacentWord(
  db,
  fields,
  currentId,
  mode,
  userId,
  mustHaveImage
) {
  let query = buildBaseWordQuery(db, fields, userId, mustHaveImage);
  query = applyArchiveFilter(query, userId);
  const condition = mode === NavigationMode.Next
    ? gt(schema.words.id, currentId)
    : lt(schema.words.id, currentId);
  query = query.where(condition);
  query = query.orderBy(mode === NavigationMode.Next ? asc(schema.words.id) : desc(schema.words.id));
  query = query.limit(1);
  const result = await query;
  return result[0] || null;
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
  // 构建基础字段（可复用）
  const wordsFields = {
    id: schema.words.id,
    word_text: schema.words.word_text,
    phonetic: schema.words.phonetic,
    meaning: schema.words.meaning,
  };

  const { isQuoted: isSlugQuoted, cleanSlug: searchSlug } = processSlug(slug);

  let existingWord = null;

  // 1. 根据 slug 是否存在选择查询方式
  if (searchSlug) {
    // 精确匹配
    existingWord = await findExactMatch(db, wordsFields, searchSlug, userId, mustHaveImage);
    if (!existingWord && !isSlugQuoted) {
      // 前缀匹配
      existingWord = await findPrefixMatch(db, wordsFields, searchSlug, userId, mustHaveImage);
    }
  } else {
    existingWord = await findRandomWord(db, wordsFields, userId, mustHaveImage);
  }

  // 2. 如果 mode 不是 Search，则尝试获取相邻单词（上/下一条）
  if (mode !== NavigationMode.Search) {
    if (!existingWord) {
        existingWord = await findRandomWord(db, wordsFields, userId, mustHaveImage);
    }
    const adjacent = await getAdjacentWord(db, wordsFields, existingWord.id, mode, userId, mustHaveImage);
    if (adjacent) {
      existingWord = adjacent;
    }
  }

  // 3. 处理找到的单词
  if (existingWord) {
    const wordData = await getWordDetails(c, db, existingWord);
    await log2WordViews(db, userId, existingWord.id);
    return c.json(wordData, 200);
  }

  // 4. 未找到单词的情况
  if (mode !== NavigationMode.Search || mustHaveImage) {
    // 如果是在翻页模式或必须带图片，没有更多数据
    return c.json({}, 200);
  }

  // 需要生成新单词
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

const getWordDetails = async (c, db, word) => {
  const [contentRecords, imageRecords] = await Promise.all([
    db.select().from(schema.word_content).where(eq(schema.word_content.word_id, word.id)),
    db.select().from(schema.images).where(eq(schema.images.word_id, word.id)),
  ]);
  return formatDbResultToWordResponse(c, word, contentRecords, imageRecords);
};

const generateWordCard = async (c, db, userId, slug) => {
    // if (!slug) {
    //     return null;
    // }
    const searchSlug = slug.trim().toLowerCase();
    const language = LanguageUtils.detectLanguage(searchSlug);
    const isJapanese = language === 'japanese' || language === 'mixed';

    let hasFreeQuota = false;
    try {
        hasFreeQuota = await checkAndConsumeFreeQuota(c, userId);
    } catch (error) {
        console.error(error.message);
        throw error;
    }

    const aiResponse = await generateBentoByAi(c, userId, searchSlug, isJapanese, hasFreeQuota);
    if (!aiResponse || !aiResponse[searchSlug]) {
        return null;
    }

    const geminiData = aiResponse[searchSlug];
    let newWord;
    try {
        const insertedWordResult = await db.insert(schema.words).values({
            user_id: 0,
            word_text: searchSlug,
            phonetic: geminiData.phonetic || null,
            meaning: geminiData.meaning || null,
        }).returning().get();

        if (!insertedWordResult) {
            throw new Error("Failed to insert word.");
        }
        newWord = insertedWordResult;

        const contentRecordsToInsert = mapGeminiToDbContent(newWord.id, geminiData);
        if (contentRecordsToInsert.length > 0) {
            await db.insert(schema.word_content).values(contentRecordsToInsert);
        }

        log2WordViews(db, userId, newWord.id);
        const newlyInsertedContent = await db.select().from(schema.word_content).where(eq(schema.word_content.word_id, newWord.id));
        return formatDbResultToWordResponse(c, newWord, newlyInsertedContent, []);
    } catch (dbError) {
        if (newWord) {
            await db.delete(schema.words).where(eq(schema.words.id, newWord.id));
        }
        console.error("Database transaction failed:", dbError);
        throw dbError;
    }
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
            await c.env.WORDBENTO_R2.put(objectKey, imageBinaryData.data, { contentType: 'image/jpeg' });
            await db.insert(schema.images).values({ word_id: existingWord[0].id, image_key: objectKey, prompt: example.trim() });
            return `${c.env.VITE_BASE_URL}/api/word/image/${objectKey}`;
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

const log2WordViews = async (db, userId, wordId) => {
    if (!userId || !wordId) return;
    try {
        await db.insert(schema.word_views).values({ user_id: userId, word_id: wordId });
    } catch (error) {
        console.error('Error logging word view:', error);
    }
};

const formatDbResultToWordResponse = (c, word, contentRecords, imageRecords) => {
    const content = {};
    contentRecords.forEach(record => {
        if (!content[record.content_type]) {
            content[record.content_type] = {};
        }
        try {
            const parsedContent = (record.content_type === 'examples' || record.content_type === 'forms') ? JSON.parse(record.content) : record.content;
            content[record.content_type][record.language_code] = parsedContent;
        } catch (e) {
            content[record.content_type][record.language_code] = record.content;
        }
    });

    const imageUrls = (imageRecords && imageRecords.length > 0) && imageRecords.map(img => img.image_key.startsWith('http') ? img.image_key : `${c.env.VITE_BASE_URL}/api/word/image/${img.image_key}`) || [];

    return {
        id: word.id,
        word_text: word.word_text,
        phonetic: word.phonetic,
        meaning: word.meaning,
        created_at: word.created_at,
        content: content,
        imageUrls: imageUrls,
    };
};

const mapGeminiToDbContent = (word_id, geminiData) => {
    const records = [];
    for (const type in geminiData) {
        if (type !== 'phonetic' && type !== 'meaning') {
            const content = geminiData[type];
            if (content) {
                for (const lang in content) {
                    if (lang !== 'icon') {
                        const value = Array.isArray(content[lang]) ? JSON.stringify(content[lang]) : String(content[lang]);
                        records.push({ word_id, content_type: type, language_code: lang, content: value, icon: content.icon || '' });
                    }
                }
            }
        }
    }
    return records;
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
