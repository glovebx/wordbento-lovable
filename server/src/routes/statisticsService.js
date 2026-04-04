import { sql, and, eq, gte, lte, count, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

const toLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getDailyCounts = async (db, userId, days) => {
    // Define a query window slightly wider to be safe with timezones.
    const queryEndDate = new Date();
    const queryStartDate = new Date();
    queryStartDate.setDate(queryEndDate.getDate() - days);

    // Get daily counts from DB, grouped by the DB's local time.
    const results = await db.select({
        date: sql`strftime('%Y-%m-%d', ${schema.word_views.created_at}, 'localtime')`,
        count: sql`count(DISTINCT ${schema.word_views.word_id})`
    })
    .from(schema.word_views)
    .where(and(
        eq(schema.word_views.user_id, userId),
        gte(schema.word_views.created_at, queryStartDate.toISOString()),
        lte(schema.word_views.created_at, queryEndDate.toISOString())
    ))
    .groupBy(sql`strftime('%Y-%m-%d', ${schema.word_views.created_at}, 'localtime')`);

    // Create a map of the results for easy lookup.
    const countsMap = new Map(results.map(r => [r.date, r.count]));
    
    // Generate the final array for the last `days`, using local dates.
    const finalCounts = [];
    const loopStartDate = new Date();
    loopStartDate.setDate(loopStartDate.getDate() - days + 1);

    for (let i = 0; i < days; i++) {
        const currentDate = new Date(loopStartDate);
        currentDate.setDate(loopStartDate.getDate() + i);
        
        const dateString = toLocalDateString(currentDate);
        finalCounts.push({
            date: dateString,
            count: countsMap.get(dateString) || 0
        });
    }

    return finalCounts;
};

const getTodayYesterdayCount = async (db, userId) => {
    const todayDateStr = toLocalDateString(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayDateStr = toLocalDateString(yesterdayDate);

    const results = await db.select({
        date: sql`strftime('%Y-%m-%d', ${schema.word_views.created_at}, 'localtime')`,
        count: sql`count(DISTINCT ${schema.word_views.word_id})`
    })
    .from(schema.word_views)
    .where(and(
        eq(schema.word_views.user_id, userId),
        sql`strftime('%Y-%m-%d', ${schema.word_views.created_at}, 'localtime') IN (${todayDateStr}, ${yesterdayDateStr})`
    ))
    .groupBy(sql`strftime('%Y-%m-%d', ${schema.word_views.created_at}, 'localtime')`);

    const countsMap = new Map(results.map(r => [r.date, r.count]));

    return {
        today: countsMap.get(todayDateStr) || 0,
        yesterday: countsMap.get(yesterdayDateStr) || 0,
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