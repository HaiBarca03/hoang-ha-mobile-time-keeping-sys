import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from '../../master-data/entities/company.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { AttendanceDailyTimesheet } from './attendance-daily-timesheet.entity';

@Entity('attendance_punch_records')
export class AttendancePunchRecord extends BaseEntity {
  @Column({ type: 'bigint' })
  company_id: string;

  @Column({ type: 'bigint' })
  employee_id: string;

  @Column({ type: 'bigint', nullable: true })
  daily_timesheet_id?: string | null;

  @Index({ unique: true })
  @Column()
  lark_record_id: string;

  @Index()
  @Column({ type: 'integer', nullable: true })
  day: number;

  @Column({ type: 'datetime2', nullable: true })
  punch_time?: Date | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  punch_type?: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  punch_result?: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  source_type?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  address?: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  device_id?: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  ssid?: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  photo_url?: string | null;

  @Column({ type: 'datetime2', nullable: true })
  shift_time_target?: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  raw_payload?: Record<string, any> | null;

  @Index()
  @Column({
    type: 'nvarchar',
    length: 20,
    default: 'PENDING'
  })
  processing_status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  last_error?: string | null;

  @Column({ type: 'integer', default: 0 })
  retry_count: number;

  @Index()
  @Column({ type: 'nvarchar', nullable: true })
  job_id?: string | null;

  @Column({ type: 'datetime2', nullable: true })
  processed_at?: Date | null;

  @ManyToOne(() => Company, (company) => company.attendancePunchRecords)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Employee, (employee) => employee.attendancePunchRecords)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @ManyToOne(
    () => AttendanceDailyTimesheet,
    (dailyTimesheet) => dailyTimesheet.punches,
  )
  @JoinColumn({ name: 'daily_timesheet_id' })
  dailyTimesheet: AttendanceDailyTimesheet;
}
