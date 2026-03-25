import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';

@Entity('employee_statuses')
@Index(['companyId', 'statusName'], { unique: true })
export class EmployeeStatus extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  @Index() 
  code: string; 

  @Column({ name: 'status_name', type: 'varchar' })
  statusName: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}