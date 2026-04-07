import { Injectable, Logger } from '@nestjs/common';
import { AttendanceEngine } from './engine/attendance.engine';
import { AttendanceDailyTimesheet } from './entities/attendance-daily-timesheet.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AttendancePunchRecord } from './entities/attendance-punch-record.entity';
import { In, Repository } from 'typeorm';
import { Employee } from '../master-data/entities/employee.entity';
import { AttendanceMonthlyTimesheet } from './entities/attendance-monthly-timesheet.entity';
import { RawPunchInputDto } from './engine/dto/raw-punch.input';
import { BatchPunchResultDto } from './dto/batch-punch-result.dto';
import { AttendanceTimeUtil } from './engine/utils/attendance-time.util';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  constructor(
    private attendanceEngine: AttendanceEngine,

    @InjectRepository(AttendancePunchRecord)
    private punchRecordRepo: Repository<AttendancePunchRecord>,

    @InjectRepository(AttendanceMonthlyTimesheet)
    private monthlyRepo: Repository<AttendanceMonthlyTimesheet>,

    @InjectRepository(AttendanceDailyTimesheet)
    private timesheetRepo: Repository<AttendanceDailyTimesheet>,

    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
  ) { }

  async processBatchPunches(
    inputs: RawPunchInputDto[],
  ): Promise<BatchPunchResultDto> {
    if (!inputs.length) {
      return {
        savedCount: 0,
        savedIds: [],
        queuedCalculations: 0,
        message: 'No punches received.',
      };
    }

    this.logger.log(`Processing batch of ${inputs.length} punches...`);
    const companyId = inputs[0].company_id;
    const errors: Array<{ external_user_id: string; reason: string }> = [];
    const totalCount = inputs.length;

    // 1. Lọc và ánh xạ Employee
    const externalIds = [...new Set(inputs.map((i) => i.external_user_id))];
    const employees = await this.employeeRepo.find({
      where: {
        companyId,
        userId: In(externalIds),
      },
      select: ['id', 'userId'],
    });

    const employeeMap = new Map(employees.map((e) => [e.userId, e.id]));

    // Tìm các ID không tồn tại trong DB (nhưng có trong inputs)
    externalIds.forEach(id => {
      if (!employeeMap.has(id)) {
        errors.push({ external_user_id: id, reason: 'Employee not found in timekeeping system' });
      }
    });

    // 2. Chuẩn bị entities hợp lệ
    const validEntities: AttendancePunchRecord[] = [];
    for (const input of inputs) {
      const employeeId = employeeMap.get(input.external_user_id);
      if (employeeId) {
        validEntities.push(this.punchRecordRepo.create({
          ...input,
          employee_id: employeeId,
          punch_time: input.punch_time ? new Date(input.punch_time) : null,
        }));
      }
    }

    if (validEntities.length === 0) {
      return {
        savedCount: 0,
        savedIds: [],
        queuedCalculations: 0,
        message: 'No valid records to save.',
      };
    }

    // 3. Insert theo chunk để tối ưu và cô lập lỗi
    const CHUNK_SIZE = 500;
    let savedCountValue = 0;
    const savedIds: string[] = [];

    for (let i = 0; i < validEntities.length; i += CHUNK_SIZE) {
      const chunk = validEntities.slice(i, i + CHUNK_SIZE);
      try {
        const result = await this.punchRecordRepo.insert(chunk);
        savedCountValue += chunk.length;
        savedIds.push(...result.identifiers.map(id => String(id.id)));
      } catch (chunkError) {
        this.logger.error(`Error in chunk starting at ${i}: ${chunkError.message}. Falling back to individual inserts for this chunk.`);

        // Nếu chunk lỗi, thử insert từng cái để biết cái nào lỗi cụ thể
        for (const entity of chunk) {
          try {
            const result = await this.punchRecordRepo.insert(entity);
            savedCountValue += 1;
            savedIds.push(String(result.identifiers[0].id));
          } catch (individualError) {
            errors.push({
              external_user_id: (entity as any).external_user_id || 'unknown',
              reason: `Database error: ${individualError.message}`,
            });
          }
        }
      }
    }

    this.logger.log(`Batch complete. Saved: ${savedCountValue}, Errors: ${errors.length}`);

    return {
      savedCount: savedCountValue,
      savedIds,
      queuedCalculations: 0,
      message: errors.length > 0 ? 'Batch processed with some errors.' : 'Batch processed successfully.',
    };
  }

  async calculateDailyBatch(companyId: string, dateStr?: string) {
    let date: Date;
    if (dateStr) {
      date = new Date(dateStr);
    } else {
      // Mặc định là ngày n-1 (hôm qua)
      date = new Date();
      date.setDate(date.getDate() - 1);
    }

    const dateOnly = AttendanceTimeUtil.formatDate(date);
    this.logger.log(
      `[Batch Calc] Starting calculation for company ${companyId} on date ${dateOnly}`,
    );

    // 1. Lấy danh sách nhân viên trong công ty
    const employees = await this.employeeRepo.find({
      where: { companyId },
      select: ['id'],
    });

    this.logger.log(`Found ${employees.length} employees to process.`);

    const results = {
      total: employees.length,
      success: 0,
      failed: 0,
    };

    // 2. Chạy song song theo cụm (Chunking) để tối ưu hiệu năng
    const CHUNK_SIZE = 10;
    for (let i = 0; i < employees.length; i += CHUNK_SIZE) {
      const chunk = employees.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (emp) => {
          try {
            await this.attendanceEngine.calculateDailyForEmployee(emp.id, date);
            results.success++;
          } catch (error) {
            this.logger.error(
              `Failed to calculate for employee ${emp.id}: ${error.message}`,
            );
            results.failed++;
          }
        }),
      );
      this.logger.debug(`Processed chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(employees.length / CHUNK_SIZE)}`);
    }

    this.logger.log(`[Batch Calc] Finished: ${results.success} success, ${results.failed} failed.`);
    return results;
  }

  async calculateForEmployeeByPunchRecords(companyId: string, employeeId: string) {
    this.logger.log(`[Check Calc] Starting check for employee ${employeeId} in company ${companyId}`);

    // 1. Lấy danh sách các ngày (day) duy nhất mà nhân viên này có dữ liệu chấm công
    // Dùng queryBuilder để lấy distinct 'day' từ bảng attendance_punch_records
    const punchDays = await this.punchRecordRepo
      .createQueryBuilder('punch')
      .select('punch.day')
      .where('punch.company_id = :companyId', { companyId: String(companyId) })
      .andWhere('punch.employee_id = :employeeId', { employeeId: String(employeeId) })
      .distinct(true)
      .getRawMany();

    if (!punchDays || punchDays.length === 0) {
      this.logger.warn(`No punch records found for employee ${employeeId}`);
      return { message: 'No data to calculate', success: 0 };
    }

    this.logger.log(`Found ${punchDays.length} days with punch records.`);

    const results: {
      employeeId: string;
      totalDays: number;
      details: any[]; // Định nghĩa là mảng bất kỳ để có thể push object vào
    } = {
      employeeId,
      totalDays: punchDays.length,
      details: [],
    };

    // 2. Lặp qua từng ngày để tính toán theo cụm (Chunking)
    const CHUNK_SIZE = 5; // Tính song song 5 ngày một lúc cho 1 nhân viên
    for (let i = 0; i < punchDays.length; i += CHUNK_SIZE) {
      const chunk = punchDays.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (record) => {
          const dateStr = record.punch_day.toString(); // Giả sử format 20260325
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1;
          const day = parseInt(dateStr.substring(6, 8));
          const calcDate = new Date(year, month, day);

          try {
            const dailyResult = await this.attendanceEngine.calculateDailyForEmployee(
              employeeId,
              calcDate,
            );

            results.details.push({
              date: AttendanceTimeUtil.formatDate(calcDate),
              status: 'Success',
              result: dailyResult,
            });
          } catch (error) {
            results.details.push({
              date: AttendanceTimeUtil.formatDate(calcDate),
              status: 'Failed',
              error: error.message,
            });
          }
        }),
      );
    }

    return results;
  }

  async calculateDailyTimesheet(
    employeeId: string,
    date: Date,
  ): Promise<AttendanceDailyTimesheet> {
    return this.attendanceEngine.calculateDailyForEmployee(employeeId, date);
  }

  async calculateBatchDailyTimesheets(
    employeeIds: string[],
    date: Date,
  ): Promise<void> {
    const CHUNK_SIZE = 10;
    for (let i = 0; i < employeeIds.length; i += CHUNK_SIZE) {
      const chunk = employeeIds.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (id) => {
          try {
            await this.attendanceEngine.calculateDailyForEmployee(id, date);
          } catch (error) {
            this.logger.error(`Error calculating for employee ${id}: ${error.message}`);
          }
        }),
      );
    }
  }

  async getTimesheetByDate(companyId: string, date: string) {
    try {
      const qb = this.timesheetRepo
        .createQueryBuilder('timesheet')
        .leftJoinAndSelect('timesheet.employee', 'employee')
        .where('timesheet.company_id = :companyId', { companyId });

      // yyyy-mm-dd
      const isFullDate = /^\d{4}-\d{2}-\d{2}$/.test(date);

      // yyyy-mm
      const isMonthOnly = /^\d{4}-\d{2}$/.test(date);

      if (isFullDate) {
        // SQL Server friendly: No redundant CAST if column is already 'date' type
        qb.andWhere('timesheet.attendance_date = :attendanceDate', {
          attendanceDate: date,
        });
      } else if (isMonthOnly) {
        const [year, month] = date.split('-').map(Number);
        qb.andWhere('timesheet.year = :year', { year }).andWhere(
          'timesheet.month = :month',
          { month },
        );
      } else {
        throw new Error(
          'Date format không hợp lệ. Dùng yyyy-mm-dd hoặc yyyy-mm',
        );
      }

      const timesheets = await qb.orderBy('employee.fullName', 'ASC').getMany();

      return timesheets.map((ts) => {
        const dateObj = new Date(ts.attendance_date);
        const dayStr = dateObj.getDate().toString().padStart(2, '0');

        return {
          'Họ và tên': ts.employee?.fullName || 'N/A',
          'check-in': AttendanceTimeUtil.formatTimeToVietnam(ts.check_in_raw ?? undefined),
          'user-id': ts.employee.userId,
          'check-out': AttendanceTimeUtil.formatTimeToVietnam(ts.check_out_raw ?? undefined),
          'Công điều chỉnh': parseFloat(String(ts.adjustment_hours ?? 0)),
          'Tổng công': parseFloat(String(ts.workday_count ?? 0)),
          'Nghỉ phép': parseFloat(String(ts.leave_hours ?? 0)),
          OT: parseFloat(String(ts.ot_hours ?? 0)),
          Remote: parseFloat(String(ts.remote_hours ?? 0)),
          'Không phép': ts.missing_check_in && ts.missing_check_out ? 1 : 0,
          Ngày: `Ngày ${dayStr}`,
          Tháng: `Tháng ${ts.month}/${ts.year}`,
        };
      });
    } catch (error) {
      this.logger.error('❌ getTimesheetByDate ERROR:', error);
      throw error;
    }
  }

  async getMonthlyTimesheet(
    companyId: string,
    month?: number,
    year?: number,
    employeeId?: string,
  ) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const where: any = {
      company_id: companyId,
      month: targetMonth,
      year: targetYear,
    };

    if (employeeId) {
      where.employee_id = employeeId;
    }

    return this.monthlyRepo.find({
      where,
      relations: ['employee'],
      order: {
        employee_id: 'ASC',
      },
    });
  }

  async generateMonthlyTimesheet(
    companyId: string,
    month?: number,
    year?: number,
    employeeId?: string,
  ) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    this.logger.log(
      `[Monthly Gen] Generating for company ${companyId}, month ${targetMonth}/${targetYear}, employee: ${employeeId || 'ALL'}`,
    );

    const query = this.timesheetRepo
      .createQueryBuilder('d')
      .select('d.employee_id', 'employee_id')
      .addSelect('MAX(d.department_code)', 'department_code')

      .addSelect(
        'SUM(d.actual_work_hours / NULLIF(d.total_work_hours_standard, 0))',
        'total_work_days',
      )
      .addSelect('SUM(d.workday_count)', 'total_workday_count')
      .addSelect('SUM(d.actual_work_hours)', 'total_work_hours')
      .addSelect('SUM(d.late_minutes)', 'total_late_minutes')
      .addSelect(
        'SUM(CASE WHEN d.is_late = true THEN 1 ELSE 0 END)',
        'total_late_days',
      )
      .addSelect(
        'SUM(CASE WHEN d.is_early_leave = true THEN 1 ELSE 0 END)',
        'total_early_leave_days',
      )
      .addSelect('SUM(d.early_leave_minutes)', 'total_early_leave_minutes')
      .addSelect(
        'SUM(CASE WHEN d.missing_check_in OR d.missing_check_out THEN 1 ELSE 0 END)',
        'total_missing_check',
      )
      .addSelect('SUM(d.ot_hours)', 'total_ot_hours')
      .addSelect('SUM(d.leave_hours / 8)', 'total_leave_days')
      .addSelect('SUM(d.remote_hours / 8)', 'total_remote_days')

      .where('d.company_id = :companyId', { companyId })
      .andWhere('d.month = :month', { month: targetMonth })
      .andWhere('d.year = :year', { year: targetYear })
      .groupBy('d.employee_id');

    if (employeeId) {
      query.andWhere('d.employee_id = :employeeId', { employeeId });
    }

    const stats = await query.getRawMany();

    if (!stats.length) {
      this.logger.warn('No data found for the specified period.');
      return [];
    }

    const records = stats.map((s) => ({
      company_id: companyId,
      employee_id: s.employee_id,
      department_code: s.department_code || '',
      month: targetMonth,
      year: targetYear,
      total_work_days: parseFloat(s.total_work_days || 0),
      total_workday_count: parseFloat(s.total_workday_count || 0),
      total_work_hours: parseFloat(s.total_work_hours || 0),
      total_late_minutes: Number(s.total_late_minutes || 0),
      total_late_days: Number(s.total_late_days || 0),
      total_early_leave_minutes: Number(s.total_early_leave_minutes || 0),
      total_missing_check: Number(s.total_missing_check || 0),
      total_ot_hours: parseFloat(s.total_ot_hours || 0),
      total_leave_days: parseFloat(s.total_leave_days || 0),
      total_remote_days: parseFloat(s.total_remote_days || 0),
      last_sync_at: new Date(),
      confirmation_status: 'pending',
    }));

    await this.monthlyRepo.upsert(records, {
      conflictPaths: ['employee_id', 'company_id', 'month', 'year'],
    });

    return records;
  }
}
