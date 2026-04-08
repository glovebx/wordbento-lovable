import { eq, desc, sql, like, and, isNull } from 'drizzle-orm';
import * as schema from '../db/schema.js';

// Service to get all words with pagination and search
export const getAllWords = async (db, page, limit, query, noImageOnly) => {
    const offset = (page - 1) * limit;

    // Base query
    let queryBuilder = db.select({ word: schema.words }).from(schema.words);

    // Handle no-image filter
    if (noImageOnly) {
        queryBuilder = queryBuilder.leftJoin(schema.images, eq(schema.words.id, schema.images.word_id))
                                 .where(isNull(schema.images.id));
    }

    // Handle search term
    const conditions = [];
    if (query) {
        conditions.push(like(schema.words.word_text, `%${query}%`));
    }

    // We need a separate query for counting that respects all conditions
    let countQueryBuilder = db.select({ count: sql`count(*)` }).from(schema.words);
    if (noImageOnly) {
        countQueryBuilder = countQueryBuilder.leftJoin(schema.images, eq(schema.words.id, schema.images.word_id))
                                             .where(isNull(schema.images.id));
    }
    if (conditions.length > 0) {
        countQueryBuilder = countQueryBuilder.where(and(...conditions));
    }

    // Apply conditions to the main query builder
    if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions));
    }

    // Execute both queries
    const [wordsResult, totalResult] = await Promise.all([
        queryBuilder
            .orderBy(desc(schema.words.id))
            .limit(limit)
            .offset(offset),
        countQueryBuilder
    ]);

    const words = wordsResult.map(res => res.word); // Extract just the word data
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
