#!/usr/bin/env node
/**
 * 전체 프로젝트 PRD_V4 검증 및 강제 실행 스크립트
 * 
 * 데이터베이스의 모든 PRD 버전을 검증하고, 누락된 필드를 자동으로 채웁니다.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PRD_V4 스키마 (경량)
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

/**
 * 누락된 필드를 기본값으로 채움
 */
function fillMissingV4Fields(json: any) {
  const filled = { ...json };
  
  // prompt_version 강제 설정
  filled.prompt_version = 'PRD_V4';
  
  // why 필드 채우기
  if (!filled.why) {
    filled.why = filled.summary || '이 프로젝트는 사용자 요구사항을 충족하고 비즈니스 목표를 달성하기 위해 개발되었습니다.';
  }
  
  // scope 필드 채우기
  if (!filled.scope) {
    filled.scope = {
      in_scope: filled.key_features?.map((f: any) => f.name || f).filter(Boolean) || [],
      out_of_scope: Array.isArray(filled.out_of_scope) ? filled.out_of_scope : [],
    };
  }
  
  // definition_of_done 필드 채우기
  if (!filled.definition_of_done || filled.definition_of_done.length === 0) {
    filled.definition_of_done =
      Array.isArray(filled.acceptance) && filled.acceptance.length > 0
        ? filled.acceptance
        : Array.isArray(filled.acceptance_criteria) && filled.acceptance_criteria.length > 0
          ? filled.acceptance_criteria
          : [
              '모든 기능이 테스트를 통과해야 함',
              '문서화가 완료되어야 함',
              '코드 리뷰가 완료되어야 함',
            ];
  }
  
  // schema_summary 필드 채우기
  if (!filled.schema_summary) {
    filled.schema_summary = {
      entities: [
        {
          name: 'Entity',
          description: 'Schema not defined',
          fields: [{ name: 'id', type: 'string' }],
          relationships: [],
        },
      ],
    };
  }
  
  // goals 정량 목표 변환
  if (!filled.goals || filled.goals.length === 0) {
    filled.goals = ['D30 내 프로젝트 완성'];
  } else {
    filled.goals = filled.goals.map((goal: string) => {
      if (typeof goal === 'string') {
        // 이미 정량 목표 형식이면 그대로 유지
        if (/[<>]=?|>=|<=|=/.test(goal) && /\d/.test(goal)) {
          return goal;
        }
        // 정량 목표가 아니면 기본 형식으로 변환
        return `D30 내 ${goal} 달성`;
      }
      return `D30 내 목표 달성`;
    });
  }
  
  return filled;
}

async function enforceValidation() {
  console.log('🔍 Starting PRD_V4 validation enforcement...\n');

  // 모든 PRD 버전 조회 (v0 제외)
  const { data: versions, error: fetchError } = await supabase
    .from('project_prd_versions')
    .select('id, version, summary_json, project_prd_id')
    .gt('version', 0);

  if (fetchError) {
    console.error('❌ Error fetching PRD versions:', fetchError);
    process.exit(1);
  }

  if (!versions || versions.length === 0) {
    console.log('✅ No PRD versions to validate.');
    return;
  }

  console.log(`📊 Found ${versions.length} PRD versions to validate\n`);

  let validCount = 0;
  let fixedCount = 0;
  let errorCount = 0;

  for (const version of versions) {
    try {
      const currentJson = version.summary_json || {};
      
      // V4 스키마 검증
      const validation = PRDV4Schema.safeParse(currentJson);
      
      if (validation.success) {
        console.log(`  ✅ Version ${version.version} (${version.id.substring(0, 8)}...) - Valid`);
        validCount++;
        continue;
      }

      console.log(`  🔧 Version ${version.version} (${version.id.substring(0, 8)}...) - Fixing...`);
      
      // 누락된 필드 채우기
      const filledJson = fillMissingV4Fields(currentJson);
      
      // 재검증
      const revalidation = PRDV4Schema.safeParse(filledJson);
      
      if (revalidation.success) {
        // 데이터베이스 업데이트
        const { error: updateError } = await supabase
          .from('project_prd_versions')
          .update({
            summary_json: filledJson,
          })
          .eq('id', version.id);

        if (updateError) {
          console.error(`    ❌ Update failed: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`    ✅ Fixed and updated`);
          fixedCount++;
        }
      } else {
        console.error(`    ❌ Fix failed - validation errors:`);
        for (const issue of revalidation.error.issues) {
          console.error(`      - ${issue.path.join('.')}: ${issue.message}`);
        }
        errorCount++;
      }
    } catch (error) {
      console.error(`    ❌ Error processing ${version.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ Validation enforcement complete!`);
  console.log(`   Valid: ${validCount}`);
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Total: ${versions.length}`);
}

// 실행
enforceValidation().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

