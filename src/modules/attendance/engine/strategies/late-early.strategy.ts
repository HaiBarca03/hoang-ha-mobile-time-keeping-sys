import { Injectable, Logger } from '@nestjs/common';
import { differenceInMinutes } from 'date-fns';
import { CalculationContext } from '../dto/calculation-context.dto';
import { AttendanceTimeUtil } from '../utils/attendance-time.util';
// import { RuleFactoryService } from '../services/rule-factory.service';

@Injectable()
export class LateEarlyStrategy {
  private readonly logger = new Logger(LateEarlyStrategy.name);

  // constructor(private ruleFactory: RuleFactoryService) {}

  process(context: CalculationContext): void {
    if (context.isConfiguredOffDay || !context.shiftContext?.rule) return;

    const { onTime, offTime } = context.shiftContext.rule;
    let totalLate = 0;
    let totalEarly = 0;

    for (const punch of context.punches) {
      // 1. Tính đi muộn (Late)
      if (punch.check_in_time) {
        const actualShiftStart = AttendanceTimeUtil.combine(
          punch.check_in_time,
          onTime,
        );
        const lateMin = differenceInMinutes(
          punch.check_in_time,
          actualShiftStart,
        );

        // Theo quy định: 1 phút cũng tính là muộn
        const finalLate = Math.max(0, lateMin);
        punch.late_hours = AttendanceTimeUtil.minutesToHours(finalLate);
        totalLate += finalLate;
      } else {
        punch.miss_check_in = true;
      }

      // 2. Tính về sớm (Early)
      if (punch.check_out_time) {
        const actualShiftEnd = AttendanceTimeUtil.combine(
          punch.check_out_time,
          offTime,
        );
        const earlyMin = differenceInMinutes(
          actualShiftEnd,
          punch.check_out_time,
        );

        const finalEarly = Math.max(0, earlyMin);
        punch.early_hours = AttendanceTimeUtil.minutesToHours(finalEarly);
        totalEarly += finalEarly;
      } else {
        punch.miss_check_out = true;
      }

      // 3. QUAN TRỌNG: Bỏ flag 'is_invalid_workday'
      // Vì đi muộn 1 phút vẫn có thể được tính công tỷ lệ hoặc công đủ nếu làm bù.
      context.isInvalidWorkday = false;
    }

    context.totalLateMinutes = totalLate;
    context.totalEarlyMinutes = totalEarly;
  }
}
