import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  /** Clerk user id (user_...). */
  id: text('id').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  role: text('role').notNull().default('student'),
  /** Receive the weekly activity summary by email. */
  digestOptIn: boolean('digest_opt_in').notNull().default(true),
  lastDigestAt: timestamp('last_digest_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Which workshops a learner has joined; My Work and the weekly summary only show these. */
export const enrollments = pgTable(
  'enrollments',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workshop: text('workshop').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.workshop] })],
)

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
    workshop: text('workshop').notNull().default('water-rocket'),
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

/** People who asked to join an in-person (physical) workshop. Filled in from /in-person, read on /admin. */
export const eventInterest = pgTable(
  'event_interest',
  {
    id: text('id').primaryKey(),
    workshop: text('workshop').notNull().default('water-rocket'),
    /** Set when the person was signed in while filling in the form. */
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    city: text('city').notNull(),
    kids: integer('kids').notNull().default(1),
    ages: text('ages'),
    /** school | public | either */
    format: text('format').notNull().default('either'),
    message: text('message'),
    /** new | contacted | booked | closed (admin bookkeeping; only "new" is written by the site) */
    status: text('status').notNull().default('new'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('event_interest_created_idx').on(t.createdAt), index('event_interest_email_idx').on(t.email)],
)
