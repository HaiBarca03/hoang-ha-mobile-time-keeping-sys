import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774762137773 implements MigrationInterface {
    name = 'Init1774762137773'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "workday_count" decimal(6,2) NOT NULL CONSTRAINT "DF_b0d863fbf39a5d53c48330e7e3e" DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP CONSTRAINT "DF_b0d863fbf39a5d53c48330e7e3e"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP COLUMN "workday_count"`);
    }

}
