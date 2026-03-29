import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774760048598 implements MigrationInterface {
    name = 'Init1774760048598'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_a123f781aec89de6ee8ea17246" ON "employees"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_UNIT_LARK" ON "employees" ("company_id", "lark_id") WHERE [lark_id] IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_UNIT_LARK" ON "employees"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a123f781aec89de6ee8ea17246" ON "employees" ("company_id", "lark_id") `);
    }

}
