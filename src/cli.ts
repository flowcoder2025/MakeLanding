#!/usr/bin/env node
import { parseCliArgs } from './input/index.js';

const input = parseCliArgs(process.argv);
console.log(JSON.stringify(input, null, 2));
