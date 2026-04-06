import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1775464467945 implements MigrationInterface {
    name = 'Init1775464467945'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "reomte_work_day" decimal(6,2) NOT NULL CONSTRAINT "DF_25fe96799d8effcba88a61f954d" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "ot_work_day" decimal(6,2) NOT NULL CONSTRAINT "DF_ede1362c419c229cb89f0a295ff" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "adjustment_work_day" decimal(6,2) NOT NULL CONSTRAINT "DF_f669917b1b811d2d6d4b8421251" DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP CONSTRAINT "DF_f669917b1b811d2d6d4b8421251"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP COLUMN "adjustment_work_day"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP CONSTRAINT "DF_ede1362c419c229cb89f0a295ff"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP COLUMN "ot_work_day"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP CONSTRAINT "DF_25fe96799d8effcba88a61f954d"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP COLUMN "reomte_work_day"`);
    }

}
