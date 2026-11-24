import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

/**
 * .env.local'ı okur ve değerleri process.env'e YAZAR (var olanların üstüne).
 * Böylece Windows'ta aynı isimde eski bir sistem değişkeni olsa bile
 * betikler her zaman .env.local'daki değeri kullanır. Değerler asla yazdırılmaz.
 */
export function loadLocalEnv(root: string = process.cwd()): void {
  const parsed = parseEnv(readFileSync(path.join(root, ".env.local"), "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined && value !== "") process.env[key] = value;
  }
}
