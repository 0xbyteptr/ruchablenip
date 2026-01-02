import { checkNip } from "./checkNip.js";
import { generateNip } from "./generateNip.js";
import { readFile, writeFile } from "fs/promises";

const FILE = "valid.json";

async function loadExisting(): Promise<any[]> {
  try {
    const data = await readFile(FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return []; // plik nie istnieje
  }
}

async function saveResult(result: any) {
  const existing = await loadExisting();

  // opcjonalnie unikamy duplikatów po NIP
  if (existing.some(e => e.nip === result.nip)) {
    return;
  }

  existing.push(result);
  await writeFile(FILE, JSON.stringify(existing, null, 2), "utf-8");
}

async function run() {
  while (true) {
    try {
      const nip = generateNip();
      const firma = await checkNip(nip);

      console.log("✅ ZNALEZIONO:", firma.nip, firma.nazwa);
      await saveResult(firma);

    } catch (err) {
      console.log("❌", (err as Error).message);
    }

    // mała przerwa żeby nie spamować API
    await new Promise(r => setTimeout(r, 300));
  }
}

run();
