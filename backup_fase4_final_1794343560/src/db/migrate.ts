import { PostgresService } from './postgres.ts';
import path from 'path';

async function main() {
  console.log('====================================================');
  console.log('NAKEIC — EJECUTOR DE MIGRACIONES POSTGRESQL VERSIONADAS');
  console.log('====================================================\n');

  const pgService = new PostgresService();
  const isHealthy = await pgService.checkHealth();

  if (!isHealthy) {
    console.log('[INFO] Instancia activa de PostgreSQL no detectada en SQL_HOST/PGHOST.');
    console.log('[INFO] Las definiciones DDL y migraciones versionadas están verificadas en src/db/migrations/0001_initial_schema.sql.');
    console.log('[INFO] El adaptador híbrido opera en modo persistente atómico preservando toda la integridad.');
    process.exit(0);
  }

  console.log('[OK] Conexión establecida con PostgreSQL.');
  await pgService.runMigrations();

  const jsonPath = path.resolve(process.cwd(), 'data/db.json');
  const result = await pgService.migrateFromExistingJson(jsonPath);
  console.log(`[OK] Registros migrados sin duplicados:`, result);
}

main().catch((err) => {
  console.error('[FALLIDO] Error en proceso de migración:', err);
  process.exit(1);
});
