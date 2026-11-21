import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  sqlitePragmasSet?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Configure SQLite PRAGMAs:
 * - WAL mode for high concurrency (PRAGMA journal_mode returns a row, so use $queryRawUnsafe)
 * - Foreign Keys enforced
 * - 5-second busy timeout to prevent locking conflicts
 */
export async function ensureSqlitePragmas() {
  if (globalForPrisma.sqlitePragmasSet) return;
  try {
    // PRAGMA journal_mode returns result ("wal"), so queryRawUnsafe must be used
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
    globalForPrisma.sqlitePragmasSet = true;
  } catch (e) {
    // Continue if already connected or in test env
    console.warn("Notice: SQLite PRAGMA initialization:", e);
  }
}
