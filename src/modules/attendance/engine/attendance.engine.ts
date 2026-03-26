import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftResolverService } from './services/shift-resolver.service';
import { PunchProcessingStrategy } from './strategies/punch-processing.strategy';
import { BreakTimeStrategy } from './strategies/break-time.strategy';
import { LateEarlyStrategy } from './strategies/late-early.strategy';
import { OvertimeStrategy } from './strategies/overtime.strategy';
import { RemoteWorkStrategy } from './strategies/remote-work.strategy';
import { WorkdayCalculationStrategy } from './strategies/workday-calculation.strategy';
import { CalculationContext } from './dto/calculation-context.dto';
import { AttendanceDailyTimesheet } from '../entities/attendance-daily-timesheet.entity';
import { AttendanceDailyPunch } from '../entities/attendance-daily-punch.entity';
import { Employee } from 'src/modules/master-data/entities/employee.entity';
import { LeaveStrategy } from './strategies/leave.strategy';
import { CorrectionStrategy } from './strategies/correction.strategy';

@Injectable()
export class AttendanceEngine {
  private readonly logger = new Logger(AttendanceEngine.name);
  constructor(
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,

    @InjectRepository(AttendanceDailyTimesheet)
    private timesheetRepo: Repository<AttendanceDailyTimesheet>,

    @InjectRepository(AttendanceDailyPunch)
    private punchRepo: Repository<AttendanceDailyPunch>,

    private shiftResolver: ShiftResolverService,
    private punchStrategy: PunchProcessingStrategy,
    private breakStrategy: BreakTimeStrategy,
    private lateEarlyStrategy: LateEarlyStrategy,
    private overtimeStrategy: OvertimeStrategy,
    private remoteStrategy: RemoteWorkStrategy,
    private workdayStrategy: WorkdayCalculationStrategy,
    private leaveStrategy: LeaveStrategy,
    private correctionStrategy: CorrectionStrategy,
  ) { }

  async calculateDailyForEmployee(
    employeeId: string,
    date: Date,
  ): Promise<AttendanceDailyTimesheet> {
    this.logger.debug(`================ ENGINE START ================`);
    this.logger.debug(`EmployeeId: ${employeeId}`);
    this.logger.debug(`Date: ${date.toISOString()}`);

    const employee = await this.getEmployee(employeeId);

    this.logger.debug(`Employee loaded`);
    this.logger.debug(
      JSON.stringify(
        {
          id: employee.id,
          company: employee.company?.companyName,
          attendanceGroup: employee.attendanceGroup?.groupName,
          employeeType: employee.employeeType?.typeName,
        },
        null,
        2,
      ),
    );

    const context = new CalculationContext(employee, date);

    context.attendanceGroupCode = context.employee.attendanceGroup?.code;
    // ===== SHIFT RESOLVE =====
    context.shiftContext = await this.shiftResolver.resolveShift(context);

    this.logger.debug(`SHIFT RESOLVED`);

    // ===== PUNCH PROCESSING =====
    this.logger.debug(`STEP 1: PUNCH PROCESSING START`);
    await this.punchStrategy.process(context);

    this.logger.debug(`STEP 1 RESULT - PUNCHES`);

    // ===== Correction PROCESSING =====
    await this.correctionStrategy.process(context);

    // ===== BREAK TIME =====
    this.logger.debug(`STEP 2: BREAK STRATEGY START`);
    this.breakStrategy.process(context);

    this.logger.debug(`STEP 2 RESULT`);

    // ===== LATE / EARLY =====
    this.logger.debug(`STEP 3: LATE EARLY STRATEGY START`);
    this.lateEarlyStrategy.process(context);

    this.logger.debug(`STEP 3 RESULT`);
    this.logger.debug(
      JSON.stringify(
        {
          totalLateMinutes: context.totalLateMinutes,
          totalEarlyMinutes: context.totalEarlyMinutes,
          latePenalty: context.latePenalty,
          earlyPenalty: context.earlyPenalty,
        },
        null,
        2,
      ),
    );

    this.logger.debug(`STEP 4.5: REMOTE WORK STRATEGY START`);
    await this.remoteStrategy.process(context);

    this.logger.debug(`STEP 4.6: OVERTIME STRATEGY START`);
    await this.overtimeStrategy.process(context);

    // ===== 6. LEAVE STRATEGY (NGHỈ PHÉP/CHẾ ĐỘ) =====
    await this.leaveStrategy.process(context);

    // ===== WORKDAY CALC =====
    this.logger.debug(`STEP 4: WORKDAY CALCULATION START`);
    this.workdayStrategy.process(context);

    this.logger.debug(`STEP 4 RESULT`);
    this.logger.debug(
      JSON.stringify(
        {
          totalWorkedHours: context.totalWorkedHours,
        },
        null,
        2,
      ),
    );

    // ===== SAVE =====
    this.logger.debug(`STEP 5: SAVE TIMESHEET`);
    const result = await this.saveOrUpdateTimesheet(context);

    this.logger.debug(`TIMESHEET RESULT`);
    // this.logger.debug(JSON.stringify(result, null, 2));

    this.logger.debug(`================ ENGINE END ================`);

    return result;
  }

  private employeeCache = new Map<string, { data: Employee; expireAt: number }>();

  private async getEmployee(id: string): Promise<Employee> {
    const now = Date.now();
    const cached = this.employeeCache.get(id);

    // Cache valid for 10 minutes
    if (cached && cached.expireAt > now) {
      return cached.data;
    }

    const employee = await this.employeeRepo.findOne({
      where: { id },
      relations: [
        'company',
        'attendanceGroup',
        'attendanceGroup.defaultShift',
        'attendanceGroup.defaultShift.restRule',
        'attendanceMethod',
        'employeeType',
        'jobLevel',
      ],
    });

    if (!employee) {
      throw new Error(`Employee with ID ${id} not found`);
    }

    this.employeeCache.set(id, { data: employee, expireAt: now + 10 * 60 * 1000 });

    // Prevent memory leak by cleaning up old keys occasionally
    if (this.employeeCache.size > 1000) {
      for (const [key, value] of this.employeeCache.entries()) {
        if (value.expireAt <= Date.now()) {
          this.employeeCache.delete(key);
        }
      }
    }

    return employee;
  }

  private async saveOrUpdateTimesheet(
    context: CalculationContext,
  ): Promise<AttendanceDailyTimesheet> {
    let timesheet =
      (await this.timesheetRepo.findOne({
        where: {
          employee_id: context.employee.id,
          attendance_date: context.date,
        },
      })) || new AttendanceDailyTimesheet();

    // --- 1. Thông tin định danh ---
    timesheet.company_id = context.companyId;
    timesheet.employee_id = context.employee.id;
    timesheet.attendance_date = context.date;
    timesheet.weekday = context.date.getDay();
    timesheet.month = context.date.getMonth() + 1;
    timesheet.year = context.date.getFullYear();
    timesheet.shift_id = context.shiftContext?.shift?.id;

    // --- 2. Dữ liệu Check-in/out ---
    const primaryPunch =
      context.punches && context.punches.length > 0 ? context.punches[0] : null;
    timesheet.is_configured_off_day = context.isConfiguredOffDay || false;

    // Lưu giờ quẹt thẻ thực tế (đã qua Correction nếu có)
    timesheet.check_in_raw = primaryPunch?.check_in_time ?? null;
    timesheet.check_out_raw = primaryPunch?.check_out_time ?? null;
    timesheet.check_in_actual = primaryPunch?.check_in_time ?? null;
    timesheet.check_out_actual = primaryPunch?.check_out_time ?? null;

    timesheet.check_in_result = primaryPunch?.miss_check_in
      ? 'Lack'
      : context.totalLateMinutes > 0
        ? 'Late'
        : 'InTime';
    timesheet.check_out_result = primaryPunch?.miss_check_out
      ? 'Lack'
      : context.totalEarlyMinutes > 0
        ? 'Early'
        : 'OutTime';

    // --- 3. Chỉ số tính toán ---
    timesheet.late_minutes = context.totalLateMinutes;
    timesheet.early_leave_minutes = context.totalEarlyMinutes;

    // Tổng phút làm việc thực tế (đã trừ nghỉ trưa)
    timesheet.work_minutes = Math.round(context.totalWorkedHours * 60);
    timesheet.actual_work_hours = context.totalWorkedHours;
    timesheet.total_work_hours_standard =
      context.shiftContext?.getStandardWorkHours() || 8;

    // Tính rest_minutes dựa trên thực tế trừ nghỉ (holidayTime trong BreakStrategy)
    timesheet.rest_minutes = context.holidayTime || 0;

    // Logic Redundant cho Store
    if (context.attendanceGroupCode === 'STORE_GROUP') {
      const standardHours = timesheet.total_work_hours_standard;
      if (context.totalWorkedHours > standardHours) {
        timesheet.is_redundant = true;
        timesheet.work_hours_redundant =
          context.totalWorkedHours - standardHours;
      } else {
        timesheet.is_redundant = false;
        timesheet.work_hours_redundant = 0;
      }
    }

    // --- 4. Trạng thái vi phạm & Đơn từ ---
    timesheet.missing_check_in = !!primaryPunch?.miss_check_in;
    timesheet.missing_check_out = !!primaryPunch?.miss_check_out;
    timesheet.is_late = context.totalLateMinutes > 0;
    timesheet.is_early_leave = context.totalEarlyMinutes > 0;

    // Nghỉ phép
    timesheet.is_leave = (context.leaveHours ?? 0) > 0;
    timesheet.leave_hours = context.leaveHours ?? 0;

    // Remote (SỬA LỖI: onlineValue bản chất đã là GIỜ, không cần nhân thêm gì cả)
    timesheet.is_remote = context.onlineValue + context.businessTripValue > 0;
    timesheet.remote_hours = context.onlineValue + context.businessTripValue;

    // OT
    timesheet.is_ot = (context.overtimeMinutes ?? 0) > 0;
    timesheet.ot_hours = (context.overtimeMinutes ?? 0) / 60;

    // Status dựa trên số công cuối cùng
    const currentWorkday = context.finalActualWorkday ?? 0;
    if (currentWorkday >= 1) timesheet.attendance_status = 'Full';
    else if (currentWorkday > 0) timesheet.attendance_status = 'Partial';
    else timesheet.attendance_status = 'Lack';

    // --- 5. Tạm thời lưu công vào adjustment_hours hoặc field mới ---
    // Vì Entity chưa có actual_workday, mình tạm gán vào adjustment_hours để test
    // Khuyên dùng: Bạn nên thêm @Column({ type: 'float' }) actual_workday vào Entity.
    timesheet.adjustment_hours = currentWorkday;

    timesheet.calculation_version = 'v1.0.0';
    timesheet.calculated_at = new Date();
    timesheet.is_recalculated = true;

    return await this.timesheetRepo.save(timesheet);
  }
}
