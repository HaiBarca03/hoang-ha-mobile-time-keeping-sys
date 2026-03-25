import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';

@Entity('employee_types')
@Index(['companyId', 'code'], { unique: true })
export class EmployeeType extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Column({ name: 'code', type: 'varchar', length: 50 })
  @Index()
  code: string;

  @Column({ name: 'type_name', type: 'varchar' })
  typeName: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}