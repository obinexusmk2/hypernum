#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_CONFIG = {
  precision: 10,
  roundingMode: 'HALF_EVEN',
  checkOverflow: true,
  maxSteps: 1000,
  debug: false
};

const DEFAULT_CONFIG_NAMES = [
  'hypernum.config.json',
  '.hypernumrc',
  '.hypernumrc.json'
];

const COMMANDS = {
  // Arithmetic (2 args)
  add:        { args: 2, fn: 'add' },
  subtract:   { args: 2, fn: 'subtract' },
  multiply:   { args: 2, fn: 'multiply' },
  divide:     { args: 2, fn: 'divide' },
  mod:        { args: 2, fn: 'remainder' },
  gcd:        { args: 2, fn: 'gcd' },
  lcm:        { args: 2, fn: 'lcm' },
  // Arithmetic (1 arg)
  abs:        { args: 1, fn: 'abs' },
  sign:       { args: 1, fn: 'sign' },
  // Power
  power:      { args: 2, fn: 'power' },
  sqrt:       { args: 1, fn: 'sqrt' },
  nthRoot:    { args: 2, fn: 'nthRoot' },
  // Factorial
  factorial:  { args: 1, fn: 'factorial' },
  binomial:   { args: 2, fn: 'binomial' },
  primorial:  { args: 1, fn: 'primorial' },
  // Conversion
  toBinary:     { args: 1, fn: 'toBinary' },
  toHex:        { args: 1, fn: 'toHexadecimal' },
  toOctal:      { args: 1, fn: 'toOctal' },
  toRoman:      { args: 1, fn: 'toRoman' },
  fromRoman:    { args: 1, fn: 'fromRoman', stringArg: true },
  toScientific: { args: 1, fn: 'toScientific' },
  toBase:       { args: 2, fn: 'toBase', secondArgIsInt: true },
  // Comparison
  compare:     { args: 2, fn: 'compare' },
  equals:      { args: 2, fn: 'equals' },
  lessThan:    { args: 2, fn: 'lessThan' },
  greaterThan: { args: 2, fn: 'greaterThan' },
};

const USAGE = `hypernum - High-precision mathematics CLI

Usage:
  hypernum <command> [args...] [options]

Arithmetic:
  add <a> <b>             Add two numbers
  subtract <a> <b>        Subtract b from a
  multiply <a> <b>        Multiply two numbers
  divide <a> <b>          Divide a by b
  mod <a> <b>             Remainder of a / b
  gcd <a> <b>             Greatest common divisor
  lcm <a> <b>             Least common multiple
  abs <n>                 Absolute value
  sign <n>                Sign (-1, 0, or 1)

Power:
  power <base> <exp>      Exponentiation
  sqrt <n>                Integer square root
  nthRoot <n> <k>         k-th root of n

Factorial:
  factorial <n>           Factorial (n!)
  binomial <n> <k>        Binomial coefficient C(n, k)
  primorial <n>           Primorial (n#)

Conversion:
  toBinary <n>            Convert to binary
  toOctal <n>             Convert to octal
  toHex <n>               Convert to hexadecimal
  toRoman <n>             Convert to Roman numeral
  fromRoman <str>         Convert from Roman numeral
  toScientific <n>        Convert to scientific notation
  toBase <n> <base>       Convert to arbitrary base

Comparison:
  compare <a> <b>         Compare (-1, 0, 1)
  equals <a> <b>          Test equality (true/false)
  lessThan <a> <b>        Test a < b (true/false)
  greaterThan <a> <b>     Test a > b (true/false)

Config:
  --init [path]           Create a config file (default: ./hypernum.config.json)
  --config [path]         Show resolved config

Options:
  --precision <n>         Set decimal precision
  --no-overflow           Disable overflow checking
  --help, -h              Show this help
  --version, -v           Show version

Examples:
  hypernum add 123456789012345678901234567890 987654321098765432109876543210
  hypernum factorial 100
  hypernum toRoman 2024
  hypernum toBase 255 16
`;

let _lib = null;

async function loadLibrary() {
  if (_lib) return _lib;
  try {
    _lib = await import('@obinexusmk2/hypernum');
  } catch {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    _lib = await import(path.resolve(__dirname, '../../dist/index.js'));
  }
  return _lib;
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

function readConfig(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Unable to read config: ${filePath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return null;
  }
}

function resolveConfig() {
  const configPath = findConfigPath();
  if (!configPath) return { ...DEFAULT_CONFIG };
  const fileConfig = readConfig(configPath);
  return { ...DEFAULT_CONFIG, ...(fileConfig || {}) };
}

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

function printConfig(explicitPath) {
  const resolvedPath = explicitPath
    ? path.resolve(process.cwd(), explicitPath)
    : findConfigPath();

  if (!resolvedPath) {
    console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
    return;
  }

  const parsed = readConfig(resolvedPath);
  if (!parsed) return;

  console.log(JSON.stringify({ ...DEFAULT_CONFIG, ...parsed }, null, 2));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    const lib = await loadLibrary();
    console.log(lib.VERSION);
    return;
  }

  if (args[0] === '--init') {
    writeConfig(args[1]);
    return;
  }

  if (args[0] === '--config') {
    printConfig(args[1]);
    return;
  }

  const commandName = args[0];
  const cmd = COMMANDS[commandName];

  if (!cmd) {
    console.error(`Unknown command: ${commandName}\n`);
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }

  // Parse positional args and options
  const positionalArgs = [];
  // Default: disable overflow checking for CLI (BigInt handles arbitrary precision)
  const options = { checkOverflow: false };
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--precision' && args[i + 1]) {
      options.precision = parseInt(args[++i], 10);
    } else if (args[i] === '--overflow') {
      options.checkOverflow = true;
    } else if (args[i] === '--no-overflow') {
      options.checkOverflow = false;
    } else if (!args[i].startsWith('--')) {
      positionalArgs.push(args[i]);
    }
  }

  if (positionalArgs.length < cmd.args) {
    console.error(`Command '${commandName}' requires ${cmd.args} argument(s), got ${positionalArgs.length}`);
    process.exitCode = 1;
    return;
  }

  const lib = await loadLibrary();
  const fn = lib[cmd.fn];

  if (typeof fn !== 'function') {
    console.error(`Function '${cmd.fn}' not found in library`);
    process.exitCode = 1;
    return;
  }

  // Only pass explicitly provided CLI options to library functions.
  // Config file defaults (precision: 10, etc.) don't map to operation defaults.
  try {
    let result;
    if (cmd.args === 1) {
      result = cmd.stringArg ? fn(positionalArgs[0]) : fn(positionalArgs[0], options);
    } else if (cmd.secondArgIsInt) {
      result = fn(positionalArgs[0], parseInt(positionalArgs[1], 10), options);
    } else {
      result = fn(positionalArgs[0], positionalArgs[1], options);
    }
    console.log(String(result));
  } catch (err) {
    console.error(`Error: ${err.message || err}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('hypernum: fatal error:', err.message || err);
  process.exitCode = 1;
});
