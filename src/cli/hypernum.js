#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_CONFIG = {
  precision: 10,
  roundingMode: 'HALF_EVEN',
  checkOverflow: true,
  maxSteps: 1000,
  debug: false
};

const DEFAULT_CONFIG_NAMES = [
  'hypernum.config.json',
  'hypernum.config.js',
  '.hypernumrc',
  '.hypernumrc.json',
  '.hypernumrc.js'
];

const USAGE = `hypernum CLI

Usage:
  hypernum --init [path]     Create a config file (default: ./hypernum.config.json)
  hypernum --config [path]   Read and print resolved config
  hypernum --help            Show help

Install globally:
  npm i -g @obinexusmk2/hypernum
  hypernum --init

Run via npx:
  npx @obinexusmk2/hypernum --init
`;

function writeConfig(filePath) {
  const targetPath = path.resolve(process.cwd(), filePath || 'hypernum.config.json');

  if (fs.existsSync(targetPath)) {
    console.error(`Config already exists: ${targetPath}`);
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(targetPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, 'utf8');
  console.log(`Created Hypernum config at ${targetPath}`);
}

function findConfigPath() {
  for (const name of DEFAULT_CONFIG_NAMES) {
    const candidate = path.resolve(process.cwd(), name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function readConfig(filePath) {
  try {
    if (filePath.endsWith('.js')) {
      const module = await import(pathToFileURL(filePath).href);
      return module.default ?? module;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Unable to read config: ${filePath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return null;
  }
}


async function printConfig(explicitPath) {
  const resolvedPath = explicitPath
    ? path.resolve(process.cwd(), explicitPath)
    : findConfigPath();

  if (!resolvedPath) {
    console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
    return;
  }

  const parsed = await readConfig(resolvedPath);
  if (!parsed) {
    return;
  }

  console.log(JSON.stringify({ ...DEFAULT_CONFIG, ...parsed }, null, 2));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return;
  }

  if (args[0] === '--init') {
    writeConfig(args[1]);
    return;
  }

  if (args[0] === '--config') {
    await printConfig(args[1]);
    return;
  }

  console.error(`Unknown command: ${args[0]}\n`);
  console.log(USAGE);
  process.exitCode = 1;
}

main();
