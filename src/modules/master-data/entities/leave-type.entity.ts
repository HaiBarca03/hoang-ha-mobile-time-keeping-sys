import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';

@Entity('leave_types')
@Index(['companyId', 'leaveTypeName'], { unique: true })
export class LeaveType extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  @Index()
  code: string;

  @Column({ name: 'leave_type_name', type: 'varchar' })
  leaveTypeName: string;

  @Column({ name: 'is_deduct_leave', type: 'boolean', default: true })
  isDeductLeave: boolean;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}