import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';

@Entity('job_levels')
@Index(['companyId', 'code'], { unique: true })
export class JobLevel extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Column({ name: 'code', type: 'nvarchar', length: 50 })
  code: string;

  @Column({ name: 'level_name', type: 'nvarchar' })
  levelName: string;

  @Column({ name: 'status', type: 'nvarchar', length: 20, default: 'ACTIVE' })
  status: string;

  // --- Relationships ---

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
