import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema.js';
import { getLearningSummary } from './statisticsService.js';

const statistics = new Hono();

statistics.get('/summary', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ message: 'Unauthorized' }, 401);
    }

    const { days = '7' } = c.req.query();
    const period = parseInt(days, 10);

    if (![7, 15, 30].includes(period)) {
        return c.json({ message: 'Invalid period specified. Must be 7, 15, or 30.' }, 400);
    }

    const db = drizzle(c.env.DB, { schema });

    try {
        const summaryData = await getLearningSummary(db, user.id, period);
        return c.json(summaryData);
    } catch (error) {
        console.error('Failed to get learning summary:', error);
        return c.json({ message: 'Failed to retrieve learning statistics.' }, 500);
    }
});

export default statistics;
