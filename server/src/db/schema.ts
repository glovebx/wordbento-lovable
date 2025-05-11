import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user").notNull(),
  salt: text("salt").notNull(),
  created_at: text("created_at").default("CURRENT_TIMESTAMP"),
  updated_at: text("updated_at").default("CURRENT_TIMESTAMP"),
  last_sign: text("last_sign"),
  uuid: text("uuid").unique(),
});

export const words = sqliteTable('words', {
  id: integer('id', { mode: 'number'}).primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  word_text: text('word_text').unique().notNull(),
  phonetic: text('phonetic'),
  meaning: text('meaning'),
  is_mastered: integer('is_mastered').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const word_content = sqliteTable('word_content', {
  id: integer('id', { mode: 'number'}).primaryKey({ autoIncrement: true }),
  word_id: integer('word_id').notNull().references(() => words.id, { onDelete: 'cascade' }),
  content_type: text('content_type').notNull(),
  language_code: text('language_code').notNull(),
  content: text('content').notNull(),
  icon: text('icon').notNull(),
}, (table) => [
    unique('unq_word_content_type_lang').on(table.word_id, table.content_type, table.language_code),
]);

export const images = sqliteTable('images', {
  id: integer('id', { mode: 'number'}).primaryKey({ autoIncrement: true }),
  word_id: integer('word_id').notNull().references(() => words.id, { onDelete: 'cascade' }),
  image_key: text('image_key').notNull()
});

// Schema for resources
export const resources = sqliteTable('resources', {
  id: integer('id', { mode: 'number'}).primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull(), // User who initiated the task
  source_type: text('source_type', { enum: ['url', 'article', 'pdf', 'image'] }).notNull(), // 'url' or 'article'
  content: text('content').notNull(), // The URL or article text
  exam_type: text('exam_type').notNull(), // Exam type
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).notNull().default('pending'), // Task status
  result: text('result', { mode: 'json' }), // Store JSON result on completion
  error: text('error'), // Store error message on failure
  uuid: text("uuid").unique(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});