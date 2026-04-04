import { sql, and, eq, gte, lte, count, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

const getDateRange = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
};

const getDailyCounts = async (db, userId, days) => {
    const { startDate, endDate } = getDateRange(days);
    
    const results = await db.select({
        date: sql`strftime('%Y-%m-%d', ${schema.word_views.created_at})`,
        count: sql`count(DISTINCT ${schema.word_views.word_id})`
    })
    .from(schema.word_views)
    .where(and(
        eq(schema.word_views.user_id, userId),
        gte(schema.word_views.created_at, startDate.toISOString()),
        lte(schema.word_views.created_at, endDate.toISOString())
    ))
    .groupBy(sql`strftime('%Y-%m-%d', ${schema.word_views.created_at})`)
    .orderBy(sql`strftime('%Y-%m-%d', ${schema.word_views.created_at})`);

    // Create a map of dates to counts for easy lookup
    const countsMap = new Map(results.map(r => [r.date, r.count]));
    
    // Fill in missing dates with a count of 0
    const finalCounts = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateString = d.toISOString().split('T')[0];
        finalCounts.push({
            date: dateString,
            count: countsMap.get(dateString) || 0
        });
    }

    return finalCounts;
};

const getTodayYesterdayCount = async (db, userId) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
    const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

    const todayResult = await db.select({ count: sql`count(DISTINCT ${schema.word_views.word_id})` })
        .from(schema.word_views)
        .where(and(
            eq(schema.word_views.user_id, userId),
            gte(schema.word_views.created_at, todayStart),
            lte(schema.word_views.created_at, todayEnd)
        ));

    const yesterdayResult = await db.select({ count: sql`count(DISTINCT ${schema.word_views.word_id})` })
        .from(schema.word_views)
        .where(and(
            eq(schema.word_views.user_id, userId),
            gte(schema.word_views.created_at, yesterdayStart),
            lte(schema.word_views.created_at, yesterdayEnd)
        ));

    return {
        today: todayResult[0]?.count || 0,
        yesterday: yesterdayResult[0]?.count || 0,
    };
};

const getRanking = async (db, userId) => {
    // This query is more complex and might be slow on large datasets without proper indexing.
    // It first calculates the total distinct words learned by each user.
    const userWordCounts = await db.select({
        userId: schema.word_views.user_id,
        count: sql`count(DISTINCT ${schema.word_views.word_id})`.as('word_count')
    })
    .from(schema.word_views)
    .groupBy(schema.word_views.user_id)
    .orderBy(desc(sql`word_count`));

    const currentUserRank = userWordCounts.findIndex(u => u.userId === userId) + 1;
    const totalUsers = userWordCounts.length;

    return {
        rank: currentUserRank > 0 ? currentUserRank : totalUsers + 1, // If user has no views, they are unranked
        totalUsers: totalUsers
    };
};

export const getLearningSummary = async (db, userId, days) => {
    const [dailyData, todayYesterday, ranking] = await Promise.all([
        getDailyCounts(db, userId, days),
        getTodayYesterdayCount(db, userId),
        getRanking(db, userId),
    ]);

    return {
        ...todayYesterday,
        dailyCounts: dailyData,
        ...ranking
    };
};