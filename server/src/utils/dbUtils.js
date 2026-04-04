import { and, eq, gt, desc } from 'drizzle-orm';
import * as schema from '../db/schema';

export const formatDbResultToWordResponse = (c, word, contentRecords, imageRecords) => {
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

    const imageUrls = (imageRecords && imageRecords.length > 0) && imageRecords.map(img => img.image_key.startsWith('http') ? img.image_key : `${c.env.VITE_IMG_URL}/${img.image_key}`) || [];

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

export const mapGeminiToDbContent = (word_id, geminiData) => {
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

export const log2WordViews = async (db, userId, wordId) => {
    if (!userId || !wordId) return;

    try {
        // Calculate the timestamp for one hour ago.
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Check for a recent view within the last hour.
        const recentView = await db.select()
            .from(schema.word_views)
            .where(and(
                eq(schema.word_views.user_id, userId),
                eq(schema.word_views.word_id, wordId),
                gt(schema.word_views.created_at, oneHourAgo.toISOString())
            ))
            .limit(1);

        // If no recent view is found, insert a new record.
        if (recentView.length === 0) {
            await db.insert(schema.word_views).values({ user_id: userId, word_id: wordId });
        }
    } catch (error) {
        console.error('Error logging word view:', error);
    }
};