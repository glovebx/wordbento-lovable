import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, unique, index } from "drizzle-orm/sqlite-core";

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
  // is_mastered: integer('is_mastered').notNull(),
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
  prompt: text('prompt'),
  image_key: text('image_key').notNull()
});

export const audios = sqliteTable('audios', {
  id: integer('id', { mode: 'number'}).primaryKey({ autoIncrement: true }),
  word_id: integer('word_id').notNull().references(() => words.id, { onDelete: 'cascade' }),
  prompt: text('prompt'),
  audio_key: text('audio_key').notNull()
});

export const videos = sqliteTable('videos', {
  id: integer('id', { mode: 'number'}).primaryKey({ autoIncrement: true }),
  word_id: integer('word_id').notNull().references(() => words.id, { onDelete: 'cascade' }),
  prompt: text('prompt'),
  video_key: text('video_key').notNull()
});

// Schema for resources
export const resources = sqliteTable('resources', {
  id: integer('id', { mode: 'number'}).primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull(), // User who initiated the task
  title: text('title').notNull(), // The Title of URL or article
  source_type: text('source_type', { enum: ['url', 'article', 'pdf', 'image'] }).notNull(), // 'url' or 'article'
  content: text('content').notNull(), // The URL or article text
  exam_type: text('exam_type').notNull(), // Exam type
  content_md5: text('content_md5').notNull(), // Exam type
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).notNull().default('pending'), // Task status
  result: text('result', { mode: 'json' }), // Store JSON result on completion
  error: text('error'), // Store error message on failure
  uuid: text("uuid").unique(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    index('idx_resource_exam_type_content').on(table.exam_type, table.content_md5),
]);

export const attachments = sqliteTable('attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  resource_id: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }), // 定义外键和级联删除
  audio_key: text('audio_key'),
  video_key: text('video_key'),
  caption_txt: text('caption_txt'),
  caption_srt: text('caption_srt'),
});

export const archives = sqliteTable('archives', {
  id: integer('id', { mode: 'number'}).primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  word_id: integer('word_id').notNull().references(() => words.id, { onDelete: 'cascade' }),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    unique('unq_user_word').on(table.user_id, table.word_id),
]);
