
import { AppDataSource } from './src/database/data-source';

async function reseed() {
    try {
        await AppDataSource.initialize();
        console.log('Data Source has been initialized!');
        
        console.log('Reseeding migrations table identity...');
        await AppDataSource.query("DBCC CHECKIDENT ('migrations', RESEED)");
        
        const info = await AppDataSource.query("DBCC CHECKIDENT ('migrations', NORESEED)");
        console.log('Current identity info:', info);

        await AppDataSource.destroy();
        console.log('Reseed complete.');
    } catch (err) {
        console.error('Error during reseed:', err);
    }
}

reseed();
