import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema.js';
import { adminRequired } from '../middleware/adminAuth.js';
import { getAllWords, deleteWord } from './adminService.js';

const admin = new Hono();

// Apply admin-only middleware to all routes in this file
admin.use('/*', adminRequired);

// Route to get all words with pagination
admin.get('/words', async (c) => {
    const { page = '1', limit = '20', query = '' } = c.req.query();
    const db = drizzle(c.env.DB, { schema });

    try {
        const data = await getAllWords(db, parseInt(page, 10), parseInt(limit, 10), query);
        return c.json(data);
    } catch (error) {
        console.error("Failed to fetch all words:", error);
        return c.json({ message: 'Failed to fetch words.' }, 500);
    }
});

// Route to delete a word
admin.delete('/words/:id', async (c) => {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) {
        return c.json({ message: 'Invalid word ID.' }, 400);
    }

    const db = drizzle(c.env.DB, { schema });

    try {
        await deleteWord(c, db, id);
        return c.json({ message: 'Word deleted successfully.' });
    } catch (error) {
        console.error(`Failed to delete word with id ${id}:`, error);
        return c.json({ message: 'Failed to delete word.' }, 500);
    }
});

export default admin;
