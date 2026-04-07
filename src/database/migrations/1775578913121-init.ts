import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1775578913121 implements MigrationInterface {
    name = 'Init1775578913121'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`EXEC sp_rename "time-attend-hhm.dbo.attendance_daily_timesheets.reomte_work_day", "remote_work_day"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP CONSTRAINT "DF_25fe96799d8effcba88a61f954d"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD CONSTRAINT "DF_450d827ac83323ff2de5cc06771" DEFAULT 0 FOR "remote_work_day"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP CONSTRAINT "DF_450d827ac83323ff2de5cc06771"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD CONSTRAINT "DF_25fe96799d8effcba88a61f954d" DEFAULT 0 FOR "remote_work_day"`);
        await queryRunner.query(`EXEC sp_rename "time-attend-hhm.dbo.attendance_daily_timesheets.remote_work_day", "reomte_work_day"`);
    }

}
