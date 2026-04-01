import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774946083301 implements MigrationInterface {
    name = 'Init1774946083301'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "user_id" varchar(255) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "department_code" varchar(255) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ADD "department_code" varchar(255)`);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_d8fa7719f0f0bdb935ad2e5357" 
            ON "departments" ("company_id", "department_code") 
            WHERE "department_code" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_d8fa7719f0f0bdb935ad2e5357" ON "departments"`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" DROP COLUMN "department_code"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP COLUMN "department_code"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP COLUMN "user_id"`);
    }
}