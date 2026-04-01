import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceEngine } from './attendance.engine';
import { AttendancePunchRecord } from '../entities/attendance-punch-record.entity';
import { AttendanceDailyPunch } from '../entities/attendance-daily-punch.entity';
import { AttendanceDailyTimesheet } from '../entities/attendance-daily-timesheet.entity';
import { Employee } from 'src/modules/master-data/entities/employee.entity';
import { PunchProcessingStrategy } from './strategies/punch-processing.strategy';
import { LateEarlyStrategy } from './strategies/late-early.strategy';
import { OvertimeStrategy } from './strategies/overtime.strategy';
import { RemoteWorkStrategy } from './strategies/remote-work.strategy';
import { WorkdayCalculationStrategy } from './strategies/workday-calculation.strategy';
import { ShiftResolverService } from './services/shift-resolver.service';
import { Shift } from 'src/modules/master-data/entities/shift.entity';
import { ApprovalManagementModule } from 'src/modules/approval-management/approval-management.module';
import { AttendanceMethod } from 'src/modules/master-data/entities/attendance-method.entity';
import { AttendanceRecordService } from './services/attendance-record.service';
import { LeaveStrategy } from './strategies/leave.strategy';
import { BreakTimeStrategy } from './strategies/break-time.strategy';
import { CorrectionStrategy } from './strategies/correction.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendancePunchRecord,
      AttendanceDailyPunch,
      AttendanceMethod,
      AttendanceDailyTimesheet,
      Employee,
      Shift,
    ]),
    forwardRef(() => ApprovalManagementModule),
  ],
  providers: [
    AttendanceEngine,
    PunchProcessingStrategy,
    BreakTimeStrategy,
    LateEarlyStrategy,
    OvertimeStrategy,
    LeaveStrategy,
    RemoteWorkStrategy,
    CorrectionStrategy,
    WorkdayCalculationStrategy,
    ShiftResolverService,
    AttendanceRecordService,
  ],
  exports: [AttendanceEngine, AttendanceRecordService],
})
export class AttendanceEngineModule { }
