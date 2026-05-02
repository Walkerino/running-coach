import { PrismaClient } from "@prisma/client";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

prisma.$on("error" as never, (event: unknown) => {
  logger.error({ event }, "Prisma emitted an error event");
});
