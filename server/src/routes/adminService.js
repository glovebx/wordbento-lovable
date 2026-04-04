import { eq, desc, sql, like, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';

// Service to get all words with pagination and search
export const getAllWords = async (db, page, limit, query) => {
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query) {
        conditions.push(like(schema.words.word_text, `%${query}%`));
    }

    const words = await db.select()
        .from(schema.words)
        .where(and(...conditions))
        .orderBy(desc(schema.words.id)) // Order by most recent
        .limit(limit)
        .offset(offset);

    const totalResult = await db.select({ count: sql`count(*)` }).from(schema.words).where(and(...conditions));
    const totalCount = totalResult[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    return {
        data: words,
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount
    };
};

// Service to delete a word and its R2 images
export const deleteWord = async (c, db, wordId) => {
    // 1. Find all associated image keys
    const imagesToDelete = await db.select({ image_key: schema.images.image_key })
        .from(schema.images)
        .where(eq(schema.images.word_id, wordId));

    const keysToDelete = imagesToDelete.map(img => img.image_key).filter(key => key && !key.startsWith('http'));

    // 2. Delete images from R2 bucket if any exist
    if (keysToDelete.length > 0) {
        console.log(`Deleting ${keysToDelete.length} images from R2 for wordId: ${wordId}`);
        await c.env.WORDBENTO_R2.delete(keysToDelete);
    }

    // 3. Delete the word from the 'words' table.
    // ON DELETE CASCADE in the schema will handle related records.
    await db.delete(schema.words).where(eq(schema.words.id, wordId));

    console.log(`Successfully deleted wordId: ${wordId} and associated data.`);
};
