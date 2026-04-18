import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

let prismaClient: PrismaClient | null = null;

export const isPrismaEnabled = () => Boolean(env.databaseUrl);

export const getPrismaClient = () => {
  if (!isPrismaEnabled()) {
    return null;
  }

  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }

  return prismaClient;
};
