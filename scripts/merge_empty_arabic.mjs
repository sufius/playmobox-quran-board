#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_DIR = "public/surat/segmented/de/27";

function printHelp() {
  console.log(
    [
      "Merge empty-arabic entries into the previous segment's translation/transcription, then delete and reindex.",
      "",
      "Usage:",
      "  node scripts/merge_empty_arabic.mjs [--base-dir <path>] [--dry-run]",
      "",
      "Options:",
      `  --base-dir <path>  Directory containing segmented surah JSON files. (default: ${DEFAULT_BASE_DIR})`,
      "  --dry-run          Compute changes without writing files.",
      "  -h, --help         Show this help message.",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  let baseDir = DEFAULT_BASE_DIR;
  let dryRun = false;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--base-dir") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Missing value for --base-dir");
      }
      baseDir = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--base-dir=")) {
      const value = arg.slice("--base-dir=".length);
      if (!value) {
        throw new Error("Missing value for --base-dir");
      }
      baseDir = value;
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { baseDir, dryRun };
}

function mergeIntoPrevious(prev, current, field) {
  let curVal = current[field] ?? "";
  curVal = String(curVal);
  if (curVal.trim() === "") {
    return;
  }

  let prevVal = prev[field] ?? "";
  prevVal = String(prevVal);

  if (prevVal.trim() === "") {
    prev[field] = curVal.trim();
  } else {
    prev[field] = `${prevVal.trimEnd()} ${curVal.trimStart()}`;
  }
}

async function mergeFile(filePath, dryRun) {
  const raw = await readFile(filePath, "utf8");
  const data = JSON.parse(raw);
  data.sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0));

  const newData = [];
  let removed = 0;
  let noPrev = 0;

  for (const item of data) {
    const arabic = String(item?.arabic ?? "");
    if (arabic.trim() === "") {
      removed += 1;
      if (newData.length > 0) {
        const prev = newData[newData.length - 1];
        mergeIntoPrevious(prev, item, "translation");
        mergeIntoPrevious(prev, item, "transcription");
      } else {
        noPrev += 1;
      }
      continue;
    }

    newData.push(item);
  }

  if (removed > 0) {
    for (let idx = 0; idx < newData.length; idx += 1) {
      newData[idx].index = idx + 1;
    }
    if (!dryRun) {
      await writeFile(filePath, JSON.stringify(newData, null, 2), "utf8");
    }
  }

  return { removed, noPrev, changed: removed > 0 };
}

async function main() {
  const { baseDir, dryRun } = parseArgs(process.argv);

  const scriptPath = fileURLToPath(import.meta.url);
  const scriptRoot = path.resolve(path.dirname(scriptPath), "..");
  const resolvedBaseDir = path.isAbsolute(baseDir)
    ? baseDir
    : path.join(scriptRoot, baseDir);

  const entries = await readdir(resolvedBaseDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(resolvedBaseDir, entry.name))
    .sort((a, b) => a.localeCompare(b));

  let totalRemoved = 0;
  let totalNoPrev = 0;
  let filesChanged = 0;

  for (const filePath of files) {
    const { removed, noPrev, changed } = await mergeFile(filePath, dryRun);
    totalRemoved += removed;
    totalNoPrev += noPrev;
    if (changed) {
      filesChanged += 1;
    }
  }

  console.log(`files_changed=${filesChanged}`);
  console.log(`removed_entries=${totalRemoved}`);
  console.log(`no_previous_entries=${totalNoPrev}`);
  if (dryRun && filesChanged) {
    console.log("dry-run: no files were written");
  }
}

main().catch((error) => {
  console.error(error?.message ?? String(error));
  process.exit(1);
});
