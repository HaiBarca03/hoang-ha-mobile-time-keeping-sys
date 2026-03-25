import { Entity, Column, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
// import { ShiftRule } from './shift-rule.entity';
import { ShiftRestRule } from './shift-rest-rule.entity';

@Entity('shifts')
@Index(['companyId', 'shiftName'], { unique: true })
@Index(['companyId', 'code'], { unique: true })
export class Shift extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'shift_name', type: 'varchar' })
  shiftName: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({ name: 'allow_late_minutes', type: 'int', default: 0 })
  allowLateMinutes: number; // Số phút cho phép đi muộn

  @Column({ name: 'allow_early_minutes', type: 'int', default: 0 })
  allowEarlyMinutes: number; // Số phút cho phép về sớm

  @Column({ name: 'shift_hours', type: 'float', default: 8 })
  shiftHours: number;

  // @Field(() => ShiftRule, { nullable: true })
  // @OneToOne(() => ShiftRule, (rule) => rule.shift)
  // rule: ShiftRule;

  @OneToMany(() => ShiftRestRule, (restRule) => restRule.shift)
  restRules: ShiftRestRule[];
}