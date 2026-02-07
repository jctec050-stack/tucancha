/**
 * Script de Backup Manual para TuCancha
 * 
 * Exporta todas las tablas críticas de Supabase a archivos JSON
 * Ejecutar: node scripts/backup-database.js
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: Variables de entorno no encontradas');
    console.error('Asegúrate de que .env.local existe y tiene NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

// Tablas a respaldar
const TABLES = [
    'profiles',
    'venues',
    'courts',
    'bookings',
    'disabled_slots',
    'subscriptions',
    'payments',
    'notifications'
];

/**
 * Fetch data from Supabase table
 */
async function fetchTableData(tableName) {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;

    try {
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`❌ Error fetching ${tableName}:`, error.message);
        return null;
    }
}

/**
 * Main backup function
 */
async function runBackup() {
    console.log('🔄 Iniciando backup de base de datos...\n');

    // Crear carpeta de backups si no existe
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupDir = path.join(__dirname, '..', 'backups', timestamp);

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    let totalRecords = 0;
    let successCount = 0;
    const summary = [];

    // Exportar cada tabla
    for (const table of TABLES) {
        console.log(`📦 Exportando tabla: ${table}...`);

        const data = await fetchTableData(table);

        if (data) {
            const filePath = path.join(backupDir, `${table}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

            const recordCount = data.length;
            totalRecords += recordCount;
            successCount++;

            console.log(`   ✅ ${recordCount} registros exportados → ${table}.json`);
            summary.push({ table, records: recordCount, status: 'success' });
        } else {
            console.log(`   ❌ Error exportando ${table}`);
            summary.push({ table, records: 0, status: 'failed' });
        }
    }

    // Crear archivo de resumen
    const summaryData = {
        timestamp: new Date().toISOString(),
        totalTables: TABLES.length,
        successfulTables: successCount,
        totalRecords: totalRecords,
        tables: summary
    };

    const summaryPath = path.join(backupDir, '_BACKUP_SUMMARY.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2), 'utf8');

    // Resumen final
    console.log('\n' + '='.repeat(50));
    console.log('✅ BACKUP COMPLETADO');
    console.log('='.repeat(50));
    console.log(`📁 Carpeta: ${backupDir}`);
    console.log(`📊 Tablas exportadas: ${successCount}/${TABLES.length}`);
    console.log(`📝 Total de registros: ${totalRecords}`);
    console.log('='.repeat(50) + '\n');

    // Instrucciones
    console.log('💡 Para restaurar este backup:');
    console.log(`   1. Ve a Supabase SQL Editor`);
    console.log(`   2. Corre: DELETE FROM <tabla> WHERE true;`);
    console.log(`   3. Importa el JSON correspondiente desde ${backupDir}`);
    console.log('');
}

// Ejecutar
runBackup().catch(error => {
    console.error('❌ Error fatal en backup:', error);
    process.exit(1);
});
