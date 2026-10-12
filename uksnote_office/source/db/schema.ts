import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{id:text('id').primaryKey(),owner:text('owner').notNull(),kind:text('kind').notNull(),data:text('data').notNull(),version:integer('version').notNull().default(1),updated:text('updated').notNull()},t=>[index('records_owner_kind').on(t.owner,t.kind)]);
export const sessions=sqliteTable('sessions',{token:text('token').primaryKey(),owner:text('owner').notNull(),expires:integer('expires').notNull()});
export const attempts=sqliteTable('attempts',{owner:text('owner').primaryKey(),count:integer('count').notNull(),until:integer('until').notNull()});
export const secrets=sqliteTable('secrets',{owner:text('owner').primaryKey(),data:text('data').notNull()});

export const identityAliases=sqliteTable('identity_aliases',{alias:text('alias').primaryKey(),owner:text('owner').notNull()});
