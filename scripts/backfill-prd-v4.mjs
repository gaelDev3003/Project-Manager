#!/usr/bin/env node
/**
 * PRD_V3 → PRD_V4 백필 스크립트
 * 
 * 기존 V3 또는 null prompt_version PRD를 V4 형식으로 변환합니다.
 * - prompt_version을 "PRD_V4"로 설정
 * - 누락된 필드(why, scope, definition_of_done, schema_summary)를 기본값으로 채움
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

/**
 * V3 database_schema를 V4 schema_summary로 변환
 */
function convertDatabaseSchemaToSchemaSummary(databaseSchema) {
  if (!databaseSchema) {
    return {
      entities: [
        {
          name: 'Unknown',
          description: 'Schema not defined',
          fields: [],
          relationships: [],
        },
      ],
    };
  }

  const entities = [];

  if (databaseSchema.relational?.tables) {
    for (const table of databaseSchema.relational.tables) {
      const fields = [];
      
      // SQL에서 필드 추출 시도 (간단한 파싱)
      if (table.sql) {
        const sqlMatch = table.sql.match(/CREATE TABLE\s+\w+\s*\(([^)]+)\)/i);
        if (sqlMatch) {
          const fieldsStr = sqlMatch[1];
          const fieldParts = fieldsStr.split(',').map((s) => s.trim());
          
          for (const fieldPart of fieldParts) {
            if (fieldPart.match(/PRIMARY KEY|INDEX|UNIQUE|CHECK|FOREIGN KEY/i)) {
              continue; // 제약조건 건너뛰기
            }
            
            const fieldMatch = fieldPart.match(/^(\w+)\s+(\w+)/);
            if (fieldMatch) {
              const [, name, type] = fieldMatch;
              fields.push({
                name,
                type: mapSqlTypeToJsonType(type),
              });
            }
          }
        }
      }

      entities.push({
        name: table.name || 'Unknown',
        description: `Table: ${table.name}`,
        fields: fields.length > 0 ? fields : [{ name: 'id', type: 'string' }],
        relationships: [],
      });
    }
  }

  if (entities.length === 0) {
    entities.push({
      name: 'Entity',
      description: 'No schema information available',
      fields: [{ name: 'id', type: 'string' }],
      relationships: [],
    });
  }

  return { entities };
}

function mapSqlTypeToJsonType(sqlType) {
  const type = sqlType.toLowerCase();
  if (type.includes('int') || type.includes('float') || type.includes('numeric')) {
    return 'number';
  }
  if (type.includes('bool')) {
    return 'boolean';
  }
  if (type.includes('date') || type.includes('timestamp')) {
    return 'date';
  }
  if (type.includes('json')) {
    return 'json';
  }
  return 'string';
}

/**
 * V3 PRD를 V4 형식으로 변환
 */
function convertV3ToV4(v3Data) {
  const v4 = {
    ...v3Data,
    prompt_version: 'PRD_V4',
  };

  // Why 필드 채우기
  if (!v4.why) {
    v4.why =
      v4.summary ||
      '이 프로젝트는 사용자 요구사항을 충족하고 비즈니스 목표를 달성하기 위해 개발되었습니다.';
  }

  // Scope 필드 채우기
  if (!v4.scope) {
    v4.scope = {
      in_scope: v4.key_features?.map((f) => f.name || f).filter(Boolean) || [],
      out_of_scope: Array.isArray(v4.out_of_scope) ? v4.out_of_scope : [],
    };
  }

  // Definition of Done 필드 채우기
  if (!v4.definition_of_done) {
    v4.definition_of_done =
      Array.isArray(v4.acceptance) && v4.acceptance.length > 0
        ? v4.acceptance
        : Array.isArray(v4.acceptance_criteria) && v4.acceptance_criteria.length > 0
          ? v4.acceptance_criteria
          : [
              '모든 기능이 테스트를 통과해야 함',
              '문서화가 완료되어야 함',
              '코드 리뷰가 완료되어야 함',
            ];
  }

  // Schema Summary 변환
  if (!v4.schema_summary && v4.database_schema) {
    v4.schema_summary = convertDatabaseSchemaToSchemaSummary(v4.database_schema);
  } else if (!v4.schema_summary) {
    v4.schema_summary = {
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

  // Goals를 정량 목표로 변환 시도
  if (v4.goals && Array.isArray(v4.goals)) {
    v4.goals = v4.goals.map((goal) => {
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
  } else if (!v4.goals || v4.goals.length === 0) {
    v4.goals = ['D30 내 프로젝트 완성'];
  }

  // database_schema 필드는 유지 (하위 호환성)
  // 하지만 schema_summary가 우선

  return v4;
}

async function backfillPRDs() {
  console.log('🔄 Starting PRD_V4 backfill...\n');

  // V3 또는 null prompt_version PRD 버전 조회
  const { data: versions, error: fetchError } = await supabase
    .from('project_prd_versions')
    .select('id, version, summary_json, project_prd_id')
    .gt('version', 0)
    .or(
      `summary_json->>prompt_version.is.null,summary_json->>prompt_version.eq.PRD_V3`
    );

  if (fetchError) {
    console.error('❌ Error fetching PRD versions:', fetchError);
    process.exit(1);
  }

  if (!versions || versions.length === 0) {
    console.log('✅ No PRD versions need backfilling.');
    return;
  }

  console.log(`📊 Found ${versions.length} PRD versions to backfill\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const version of versions) {
    try {
      const currentJson = version.summary_json || {};
      
      // 이미 V4면 건너뛰기
      if (currentJson.prompt_version === 'PRD_V4') {
        continue;
      }

      console.log(`  🔄 Processing version ${version.version} (${version.id.substring(0, 8)}...)`);

      // V3 → V4 변환
      const v4Json = convertV3ToV4(currentJson);

      // 업데이트
      const { error: updateError } = await supabase
        .from('project_prd_versions')
        .update({
          summary_json: v4Json,
        })
        .eq('id', version.id);

      if (updateError) {
        console.error(`    ❌ Update failed: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`    ✅ Converted to PRD_V4`);
        successCount++;
      }
    } catch (error) {
      console.error(`    ❌ Error processing ${version.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ Backfill complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Total: ${versions.length}`);
}

// 실행
backfillPRDs().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

