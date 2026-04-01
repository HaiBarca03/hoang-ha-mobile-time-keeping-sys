import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1775015820131 implements MigrationInterface {
    name = 'Init1775015820131'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" DROP COLUMN "maternity_shift"`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" DROP COLUMN "maternity_start_date"`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" DROP COLUMN "maternity_end_date"`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" DROP COLUMN "employee_id_swap"`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" DROP COLUMN "date_original_shift"`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" DROP COLUMN "date_swap_shift"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" ADD "date_swap_shift" date`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" ADD "date_original_shift" date`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" ADD "employee_id_swap" nvarchar(255)`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" ADD "maternity_end_date" date`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" ADD "maternity_start_date" date`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" ADD "maternity_shift" nvarchar(255)`);
    }

}
