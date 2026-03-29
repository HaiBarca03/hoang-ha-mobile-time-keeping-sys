import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774762318035 implements MigrationInterface {
    name = 'Init1774762318035'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ADD "total_workday_count" decimal(10,3) NOT NULL CONSTRAINT "DF_4f23ea31f6e3fbc4271b555ffaa" DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" DROP CONSTRAINT "DF_4f23ea31f6e3fbc4271b555ffaa"`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" DROP COLUMN "total_workday_count"`);
    }

}
