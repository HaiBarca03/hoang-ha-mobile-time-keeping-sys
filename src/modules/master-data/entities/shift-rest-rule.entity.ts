import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Shift } from './shift.entity';

@Entity('shift_rest_rules')
@Index(['shiftId', 'restBeginTime', 'restEndTime'], { unique: true })
export class ShiftRestRule extends BaseEntity {
  @Column({ name: 'shift_id', type: 'bigint' })
  shiftId: string;

  @Column({ name: 'rest_begin_time', type: 'time', nullable: true })
  restBeginTime: string;

  @Column({ name: 'rest_end_time', type: 'time', nullable: true })
  restEndTime: string;

  @ManyToOne(() => Shift, (shift) => shift.restRules)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;
}