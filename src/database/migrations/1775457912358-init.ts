import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1775457912358 implements MigrationInterface {
    name = 'Init1775457912358'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "leave_policy_id"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "leave_work_day" decimal(6,2) NOT NULL CONSTRAINT "DF_4e93b6e83e7924a7fa243318993" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "attendance_punch_records" ALTER COLUMN "punch_time" datetime2`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_punch_records" ALTER COLUMN "punch_time" datetime2 NOT NULL`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP CONSTRAINT "DF_4e93b6e83e7924a7fa243318993"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP COLUMN "leave_work_day"`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "leave_policy_id" bigint`);
    }

}
