import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "./generated/prisma/client";
import { env } from "./config/env";

const adapter = new PrismaLibSql({
  url: env.databaseUrl
});

export const prisma = new PrismaClient({ adapter });
