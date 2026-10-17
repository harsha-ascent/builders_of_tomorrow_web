import { index, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  /** Clerk user id (user_...). */
  id: text('id').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  role: text('role').notNull().default('student'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const designs = pgTable(
  'designs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workshop: text('workshop').notNull(),
    name: text('name').notNull(),
    /** Everything else about the design (bottle, colours, launcher settings). */
    params: jsonb('params').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('designs_user_workshop_idx').on(t.userId, t.workshop)],
)

export const launches = pgTable(
  'launches',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    designId: text('design_id').references(() => designs.id, { onDelete: 'set null' }),
    designName: text('design_name').notNull(),
    settings: jsonb('settings').$type<Record<string, unknown>>().notNull(),
    result: jsonb('result').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('launches_user_idx').on(t.userId, t.createdAt)],
)

export const worksheetProgress = pgTable(
  'worksheet_progress',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workshop: text('workshop').notNull(),
    worksheetId: text('worksheet_id').notNull(),
    answers: jsonb('answers').$type<Record<string, unknown>>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.workshop, t.worksheetId] })],
)

export const files = pgTable(
  'files',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    r2Key: text('r2_key').notNull().unique(),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('files_user_idx').on(t.userId)],
)
