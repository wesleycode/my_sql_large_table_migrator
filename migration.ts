import mysql, { Connection, RowDataPacket } from 'mysql2/promise';

interface MigrationConfig {
    host: string;
    user: string;
    password: string;
    database: string;
    sourceTable: string;
    targetTable: string;
    batchSize: number;
    isTestRun: boolean; // Nova opção para teste
}

async function migrateTableInBatches(config: MigrationConfig): Promise<void> {
    let connection: Connection | null = null;

    try {

        connection = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database
        });

        // Se for teste, primeiro mostra o registro que será inserido
        if (config.isTestRun) {
            console.log('MODO TESTE - Verificando primeiro registro que seria inserido...');

            const [testRecord] = await connection.execute<RowDataPacket[]>(
                `SELECT * FROM ${config.sourceTable}
         WHERE userid != '80624' 
           AND timecreated > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 4 YEAR))
         LIMIT 1`
            );

            console.log('Registro que será inserido:', testRecord[0]);

            // Insere apenas um registro para teste
            try {
                await connection.beginTransaction();

                const insertQuery = `
          INSERT INTO ${config.targetTable}
          SELECT * FROM ${config.sourceTable} 
          WHERE userid != '80624' 
            AND timecreated > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 4 YEAR))
          LIMIT 1
        `;

                await connection.execute(insertQuery);
                await connection.commit();

                console.log('Teste concluído! Um registro foi inserido com sucesso.');
                return;
            } catch (error) {
                console.error('Erro durante o teste:', error);
                await connection.rollback();
                return;
            }
        }

        // Continua com a migração completa se não for teste
        const [rows] = await connection.execute<RowDataPacket[]>(
            `SELECT COUNT(*) as total 
       FROM ${config.sourceTable}
       WHERE userid != '80624' 
         AND timecreated > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 4 YEAR))`
        );
        const totalRows = rows[0].total;

        const totalBatches = Math.ceil(totalRows / config.batchSize);

        console.log(`Total de registros a serem migrados: ${totalRows}`);
        console.log(`Número de batches: ${totalBatches}`);

        await connection.execute(`ALTER TABLE ${config.targetTable} DISABLE KEYS`);

        for (let batch = 0; batch < totalBatches; batch++) {
            const offset = batch * config.batchSize;

            try {
                await connection.beginTransaction();

                const insertQuery = `
          INSERT INTO ${config.targetTable}
          SELECT * FROM ${config.sourceTable} 
          WHERE userid != '80624' 
            AND timecreated > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 4 YEAR))
          LIMIT ${config.batchSize} OFFSET ${offset}
        `;

                await connection.execute(insertQuery);
                await connection.commit();

                const progress = ((batch + 1) / totalBatches) * 100;
                const registrosMigrados = Math.min(offset + config.batchSize, totalRows);
                console.log(
                    `Progresso: ${progress.toFixed(2)}% - Migrados ${registrosMigrados} de ${totalRows} registros`
                );
            } catch (error) {
                console.error(`Erro no batch ${batch}:`, error);
                await connection.rollback();
            }
        }

        await connection.execute(`ALTER TABLE ${config.targetTable} ENABLE KEYS`);
        console.log('Migração completa concluída!');

    } catch (error) {
        console.error('Erro durante a operação:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Conexão fechada');
        }
    }
}

// Exemplo de uso
async function main() {
    const config: MigrationConfig = {
        host: 'DATA HERE',
        user: 'DATA HERE',
        password: 'DATA HERE',
        database: 'DATA HERE',
        sourceTable: 'DATA HERE',
        targetTable: 'DATA HERE',
        batchSize: 10000,
        isTestRun: false  // Mude para false para fazer a migração completa
    };

    await migrateTableInBatches(config);
}

main().catch(console.error);