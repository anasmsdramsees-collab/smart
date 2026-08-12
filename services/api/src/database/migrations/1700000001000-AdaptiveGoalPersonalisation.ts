import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widens adaptive goals beyond the single built-in `comfort` objective:
 * a resident-facing name (for goals the resident authors), a priority used to
 * break ties when two active goals target the same device, and an optional
 * daily activation window.
 */
export class AdaptiveGoalPersonalisation1700000001000 implements MigrationInterface {
  name = 'AdaptiveGoalPersonalisation1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "adaptive_goals" ADD COLUMN "name" character varying`);
    await queryRunner.query(`ALTER TABLE "adaptive_goals" ADD COLUMN "priority" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "adaptive_goals" ADD COLUMN "active_from" character varying`);
    await queryRunner.query(`ALTER TABLE "adaptive_goals" ADD COLUMN "active_to" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "adaptive_goals" DROP COLUMN "active_to"`);
    await queryRunner.query(`ALTER TABLE "adaptive_goals" DROP COLUMN "active_from"`);
    await queryRunner.query(`ALTER TABLE "adaptive_goals" DROP COLUMN "priority"`);
    await queryRunner.query(`ALTER TABLE "adaptive_goals" DROP COLUMN "name"`);
  }
}
