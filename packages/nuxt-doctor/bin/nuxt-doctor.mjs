#!/usr/bin/env node
import { run } from '../dist/index.js';
const code = await run(process.argv);
process.exit(code);
