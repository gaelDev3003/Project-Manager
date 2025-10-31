#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// Lightweight V4 schema (duplicated for hook isolation)
const quantGoal = z
  .string()
  .min(3)
  .refine((v) => /[<>]=?|==|>=|<=|=/.test(v) && /\d/.test(v), {
    message: 'goal은 비교 연산자와 숫자를 포함해야 함',
  });

const PRDV4Schema = z.object({
  summary: z.string(),
  why: z.string(),
  goals: z.array(quantGoal).min(1),
  scope: z.object({
    in_scope: z.array(z.string()).optional(),
    out_of_scope: z.array(z.string()).optional(),
  }),
  schema_summary: z.object({
    entities: z
      .array(
        z.object({
          name: z.string(),
          fields: z.array(z.object({ name: z.string(), type: z.string() })),
        })
      )
      .min(1),
  }),
  definition_of_done: z.array(z.string()).min(1),
  prompt_version: z.literal('PRD_V4'),
});

const repoRoot = process.cwd();

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only', { encoding: 'utf8' });
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function readJSON(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

const files = getStagedFiles().filter((f) => f.endsWith('.json'));
if (files.length === 0) process.exit(0);

const errors = [];
for (const rel of files) {
  const abs = path.join(repoRoot, rel);
  const json = readJSON(abs);
  if (!json) continue;

  const res = PRDV4Schema.safeParse(json);
  if (!res.success) {
    errors.push(`[${rel}]`);
    for (const issue of res.error.issues) {
      errors.push(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
  }

  // Basic SQL ban
  const str = JSON.stringify(json).toLowerCase();
  if (str.includes('create table') || str.includes('create index')) {
    errors.push(`[${rel}] SQL 금지 위반: schema에 SQL이 포함됨`);
  }
}

if (errors.length > 0) {
  console.error('PRD_V4 검증 실패:\n' + errors.join('\n'));
  process.exit(1);
}

process.exit(0);
