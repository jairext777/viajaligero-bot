import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool } from "./pool.js";
import { logger } from "../util/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  const schemaPath = join(__dirname, "../../schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  await pool.query(schema);
  logger.info("Migraciones aplicadas");
}
