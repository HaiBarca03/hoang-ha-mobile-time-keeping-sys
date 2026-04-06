
import { AppDataSource } from './src/database/data-source';

async function check() {
    try {
        await AppDataSource.initialize();
        console.log('Data Source has been initialized!');
        
        const results = await AppDataSource.query('SELECT * FROM migrations');
        console.log('Migrations table content:', JSON.stringify(results, null, 2));

        const tableInfo = await AppDataSource.query("SELECT COLUMN_NAME, DATA_TYPE, COLUMNPROPERTY(OBJECT_ID(TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IsIdentity FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'migrations'");
        console.log('Migrations table columns:', JSON.stringify(tableInfo, null, 2));

        await AppDataSource.destroy();
    } catch (err) {
        console.error('Error during inspection:', err);
    }
}

check();
