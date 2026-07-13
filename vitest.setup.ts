import { afterEach } from "vitest";
import { prisma } from "@/lib/db";

// The BandProfile row is a fixed-id singleton ("band") that multiple test
// files (e.g. src/lib/db.test.ts, src/app/api/api.test.ts) upsert against
// the same shared data/test.db. Reset it after every test, in every file,
// so hygiene never depends on which file vitest happens to run first.
afterEach(async () => {
  await prisma.bandProfile.deleteMany({ where: { id: "band" } });
});
