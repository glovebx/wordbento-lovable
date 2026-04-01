import LanguageUtils from './languageUtils';
import { generateBentoByAi } from '../routes/word/ai';
import { checkAndConsumeFreeQuota } from './security';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { formatDbResultToWordResponse, mapGeminiToDbContent, log2WordViews } from './dbUtils';

export const generateWordCard = async (c, db, userId, slug) => {
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