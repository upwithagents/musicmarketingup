import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

export const TEST_DB_URL = "file:./data/test.db";

export default function setup() {
  // Task 2 introduces prisma/schema.prisma; until then this is a no-op so
  // `pnpm test` stays green with no schema to push against.
  if (!existsSync(path.resolve(__dirname, "prisma/schema.prisma"))) {
    return;
  }
  mkdirSync(path.resolve(__dirname, "data"), { recursive: true });
  rmSync(path.resolve(__dirname, "data/test.db"), { force: true });
  execSync("./node_modules/.bin/prisma db push", {
    cwd: __dirname,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });
}
