import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1775009834972 implements MigrationInterface {
    name = 'Init1775009834972'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_0dcd192a411cb97df0e1e0b35d8"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "leave_policy_id"`);

        await queryRunner.query(`
            DECLARE @ConstraintName nvarchar(200)
            SELECT @ConstraintName = Name FROM sys.default_constraints
            WHERE parent_object_id = object_id('attendance_daily_timesheets')
            AND parent_column_id = (SELECT column_id FROM sys.columns WHERE object_id = object_id('attendance_daily_timesheets') AND name = 'user_id')
            IF @ConstraintName IS NOT NULL
                EXEC('ALTER TABLE attendance_daily_timesheets DROP CONSTRAINT ' + @ConstraintName)
        `);

        await queryRunner.query(`
            DECLARE @ConstraintName nvarchar(200)
            SELECT @ConstraintName = Name FROM sys.default_constraints
            WHERE parent_object_id = object_id('attendance_daily_timesheets')
            AND parent_column_id = (SELECT column_id FROM sys.columns WHERE object_id = object_id('attendance_daily_timesheets') AND name = 'department_code')
            IF @ConstraintName IS NOT NULL
                EXEC('ALTER TABLE attendance_daily_timesheets DROP CONSTRAINT ' + @ConstraintName)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "department_code" nvarchar(255) CONSTRAINT "DF_92a7b50ff57e336229cb5528b92" DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "user_id" nvarchar(255) CONSTRAINT "DF_9bd7e4ba2a36a58e630b23bd157" DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "employees" ADD "leave_policy_id" bigint`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_0dcd192a411cb97df0e1e0b35d8" FOREIGN KEY ("leave_policy_id") REFERENCES "leave_policies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
}
