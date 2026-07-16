import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Mirrors the pre-existing `users` table in the Neon database so that accounts
 * created through the Admin Register page are persisted there directly. We do
 * NOT modify or drop any other tables (admins, bets, game_results,
 * game_rounds) that already exist in that database.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 })
    .notNull()
    .unique("users_username_key"),
  password: varchar("password", { length: 255 }).notNull(),
  balance: integer("balance").notNull().default(0),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  name: varchar("name", { length: 120 }),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
