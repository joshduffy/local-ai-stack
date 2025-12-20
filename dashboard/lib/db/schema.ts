import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Chat conversations
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  model: text('model').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Chat messages
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  tokenCount: integer('token_count'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Job queue for both LLM and image generation
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['chat', 'image'] }).notNull(),
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed'] }).notNull(),
  priority: integer('priority').default(0),
  input: text('input').notNull(), // JSON: prompt, model, settings
  output: text('output'), // JSON: result data
  error: text('error'),
  progress: integer('progress').default(0),
  externalId: text('external_id'), // ComfyUI prompt_id
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Generated outputs (images, etc.)
export const outputs = sqliteTable('outputs', {
  id: text('id').primaryKey(),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  type: text('type', { enum: ['image', 'text'] }).notNull(),
  filename: text('filename'),
  filepath: text('filepath'),
  prompt: text('prompt'),
  negativePrompt: text('negative_prompt'),
  model: text('model'),
  settings: text('settings'), // JSON: width, height, steps, cfg, seed, etc.
  metadata: text('metadata'), // JSON: generation time, memory usage, etc.
  favorite: integer('favorite', { mode: 'boolean' }).default(false),
  tags: text('tags'), // JSON array
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Performance benchmarks
export const benchmarks = sqliteTable('benchmarks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['llm', 'image'] }).notNull(),
  model: text('model').notNull(),
  metric: text('metric').notNull(), // 'tokens_per_sec', 'generation_time_ms', etc.
  value: real('value').notNull(),
  metadata: text('metadata'), // JSON: resolution, steps, prompt length, etc.
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Backup history
export const backups = sqliteTable('backups', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  filepath: text('filepath').notNull(),
  sizeBytes: integer('size_bytes'),
  components: text('components'), // JSON array: ['ollama', 'comfyui', 'outputs', 'database']
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Type exports
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Output = typeof outputs.$inferSelect;
export type NewOutput = typeof outputs.$inferInsert;
export type Benchmark = typeof benchmarks.$inferSelect;
export type NewBenchmark = typeof benchmarks.$inferInsert;
export type Backup = typeof backups.$inferSelect;
export type NewBackup = typeof backups.$inferInsert;
