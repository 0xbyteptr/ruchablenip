import { checkNip, isValidNip } from "./checkNip.js";
import { generateNip } from "./generateNip.js";
import { readFile, writeFile } from "fs/promises";

const FILE = "valid.json";

interface Result {
  nip: string;
  nazwa: string;
  statusVat: string;
  regon: string | null;
  adres: string;
  konta: string[];
}

async function loadExisting(): Promise<Result[]> {
  try {
    const data = await readFile(FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveResult(result: Result) {
  const existing = await loadExisting();
  if (existing.some(e => e.nip === result.nip)) return;
  existing.push(result);
  await writeFile(FILE, JSON.stringify(existing, null, 2), "utf-8");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: {
    attempts?: number;
    delayMs: number;
    reportEvery: number;
    concurrency: number;
    useProxies: boolean;
    proxyUrl: string;
  } = { delayMs: 300, reportEvery: 1, concurrency: 5, useProxies: false, proxyUrl: "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt" };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--attempts" && args[i + 1]) {
      opts.attempts = parseInt(args[i + 1], 10);
      i++;
    } else if (a === "--delay" && args[i + 1]) {
      opts.delayMs = parseInt(args[i + 1], 10);
      i++;
    } else if (a === "--report" && args[i + 1]) {
      opts.reportEvery = parseInt(args[i + 1], 10);
      i++;
    } else if (a === "--concurrency" && args[i + 1]) {
      opts.concurrency = parseInt(args[i + 1], 10);
      i++;
    } else if (a === "--use-proxies") {
      opts.useProxies = true;
    } else if (a === "--proxy-url" && args[i + 1]) {
      opts.proxyUrl = args[i + 1];
      i++;
    } else if (a === "-h" || a === "--help") {
      printHelp();
      process.exit(0);
    }
  }
  return opts;
}

function formatPercent(found: number, total: number) {
  if (total === 0) return "0.00%";
  return ((found / total) * 100).toFixed(2) + "%";
}

function printHelp() {
  console.log(`Usage: node dist/cli.js [--attempts N] [--delay ms] [--report N]

Options:
  --attempts N   Stop after N attempts (default: run until interrupted)
  --delay ms     Delay between attempts in ms (default: 300)
  --report N     Print summary every N attempts (default: 1)
`);
}

import fetch from "node-fetch";
import proxyPkg from "https-proxy-agent";
const HttpsProxyAgent: any = (proxyPkg as any).HttpsProxyAgent || proxyPkg;

const colors = {
  reset: "\x1b[0m",
  red: (s: string) => `\x1b[31m${s}${colors.reset}`,
  green: (s: string) => `\x1b[32m${s}${colors.reset}`,
  yellow: (s: string) => `\x1b[33m${s}${colors.reset}`,
  cyan: (s: string) => `\x1b[36m${s}${colors.reset}`
};

// Telegram globals (populated from config)
let TG_TOKEN: string | undefined;
let TG_CHAT: string | undefined;

async function sendTelegramMessage(text: string) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    const url = `https://api.telegram.org/bot${encodeURIComponent(TG_TOKEN)}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: "HTML" })
    });
  } catch (e) {
    // ignore telegram errors
  }
}


async function loadProxies(url: string): Promise<string[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const txt = await res.text();
    const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
    // keep lines that look like host:port
    return lines.filter(l => /^([a-zA-Z0-9\._-]+):(\d+)$/.test(l));
  } catch (e) {
    return [];
  }
}

import { config } from "./config.js";

async function run() {
  const cliOpts = parseArgs();
  // merge config defaults with CLI args (CLI overrides config)
  const opts = {
    attempts: typeof cliOpts.attempts !== 'undefined' ? cliOpts.attempts : config.attempts,
    delayMs: typeof cliOpts.delayMs !== 'undefined' ? cliOpts.delayMs : config.delayMs,
    reportEvery: typeof cliOpts.reportEvery !== 'undefined' ? cliOpts.reportEvery : config.reportEvery,
    concurrency: typeof cliOpts.concurrency !== 'undefined' ? cliOpts.concurrency : config.concurrency,
    useProxies: typeof cliOpts.useProxies !== 'undefined' ? cliOpts.useProxies : config.useProxies,
    proxyUrl: typeof cliOpts.proxyUrl !== 'undefined' ? cliOpts.proxyUrl : config.proxyUrl,
    tgToken: config.tgToken,
    tgChat: config.tgChat
  } as any;

  // set telegram globals from config
  if (opts.tgToken) TG_TOKEN = opts.tgToken;
  if (opts.tgChat) TG_CHAT = opts.tgChat;

  let attempts = 0;
  let found = 0;
  let lastFound: Result | null = null;
  const start = Date.now();

  // load existing results into memory to avoid constant file contention
  const existing = await loadExisting();
  const seen = new Set(existing.map(e => e.nip));
  const savedResults = existing.slice();
  let writeLock: Promise<void> = Promise.resolve();
  async function saveResultSafe(result: Result) {
    if (seen.has(result.nip)) return;
    seen.add(result.nip);
    savedResults.push(result);
    // serialize writes
    writeLock = writeLock.then(() => writeFile(FILE, JSON.stringify(savedResults, null, 2), "utf-8")).catch(() => {});
    await writeLock;
  }

  let proxies: string[] = [];
  const agentCache: Record<string, any> = {};
  if (opts.useProxies) {
    console.log(colors.cyan(`Pobieram listę proxy z ${opts.proxyUrl} ...`));
    proxies = await loadProxies(opts.proxyUrl);
    console.log(colors.cyan(`Znaleziono ${proxies.length} proxy`));
  }

  if (TG_TOKEN && TG_CHAT) {
    console.log(colors.cyan(`Telegram aktywny, automatycznie wysyłam powiadomienia`));
  } else {
    console.log(colors.yellow(`Telegram wyłączony (brak konfiguracji w src/config.ts)`));
  }

  let running = true;
  process.on("SIGINT", async () => {
    running = false;
  });

  // worker pool
  const workers: Promise<void>[] = [];
  const concurrency = Math.max(1, opts.concurrency || 1);

  for (let w = 0; w < concurrency; w++) {
    workers.push((async () => {
      while (running) {
        if (opts.attempts && attempts >= opts.attempts) break;
        const currentAttempt = ++attempts;
        try {
          const nip = generateNip();
          if (!isValidNip(nip)) {
            // invalid locally
          } else {
            // pick proxy for this attempt if enabled
            let agent: any = undefined;
            if (opts.useProxies && proxies.length > 0) {
              const p = proxies[(currentAttempt - 1) % proxies.length];
              if (!agentCache[p]) {
                agentCache[p] = new HttpsProxyAgent(`http://${p}`);
              }
              agent = agentCache[p];
            }

            try {
              const result = await checkNip(nip, agent);
              found++;
              lastFound = result;
              await saveResultSafe(result);
              console.log(`\n${colors.green("✅ ZNALEZIONO:")} ${result.nip} - ${result.nazwa}`);              // automatic Telegram send if configured (fire-and-forget)
              (async () => {
                const text = `✅ <b>Znaleziono</b>\nNIP: <code>${result.nip}</code>\n${result.nazwa}\nStatus: ${result.statusVat}${result.adres ? `\nAdres: ${result.adres}` : ""}`;
                try { await sendTelegramMessage(text); } catch (_) {}
              })();            } catch (err) {
              // ignore not found / API errors
            }
          }
        } catch (err) {
          // ignore
        }

        if (currentAttempt % opts.reportEvery === 0) {
          printStatus(attempts, found, start, lastFound);
        }

        if (opts.delayMs > 0) {
          await new Promise(r => setTimeout(r, opts.delayMs));
        }

        if (opts.attempts && attempts >= opts.attempts) break;
      }
    })());
  }

  // wait for workers to finish
  await Promise.all(workers);

  await printSummaryAndExit(attempts, found, start, lastFound);
}

function printStatus(attempts: number, found: number, start: number, lastFound: Result | null) {
  const elapsedSec = (Date.now() - start) / 1000;
  const ratePerMin = elapsedSec > 0 ? (attempts / elapsedSec) * 60 : 0;
  const msg = `Attempts: ${attempts}  | Found: ${found}  | Success: ${formatPercent(found, attempts)}  | Rate/min: ${ratePerMin.toFixed(1)}${lastFound ? `  | Last: ${lastFound.nip}` : ""}`;
  process.stdout.write(`\r${msg}`);
}

async function printSummaryAndExit(attempts: number, found: number, start: number, lastFound: Result | null) {
  const elapsedSec = (Date.now() - start) / 1000;
  const ratePerMin = elapsedSec > 0 ? (attempts / elapsedSec) * 60 : 0;

  console.log("\n--- SUMMARY ---");
  console.log(`Attempts: ${attempts}`);
  console.log(`Found: ${found}`);
  console.log(`Success: ${formatPercent(found, attempts)}`);
  console.log(`Elapsed: ${Math.round(elapsedSec)}s`);
  console.log(`Rate/min: ${ratePerMin.toFixed(1)}`);
  if (lastFound) {
    console.log(`Last found: ${lastFound.nip} - ${lastFound.nazwa}`);
  }
  process.exit(0);
}

run().catch(e => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
