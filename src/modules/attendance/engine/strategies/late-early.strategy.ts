import { Injectable, Logger } from '@nestjs/common';
import { differenceInMinutes } from 'date-fns';
import { CalculationContext } from '../dto/calculation-context.dto';
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
        const actualShiftStart = this.getShiftTimeOnDate(
          punch.check_in_time,
          onTime,
        );
        const lateMin = differenceInMinutes(
          punch.check_in_time,
          actualShiftStart,
        );

        // Theo quy định: 1 phút cũng tính là muộn
        const finalLate = Math.max(0, lateMin);
        punch.late_hours = finalLate / 60;
        totalLate += finalLate;
      } else {
        punch.miss_check_in = true;
      }

      // 2. Tính về sớm (Early)
      if (punch.check_out_time) {
        const actualShiftEnd = this.getShiftTimeOnDate(
          punch.check_out_time,
          offTime,
        );
        const earlyMin = differenceInMinutes(
          actualShiftEnd,
          punch.check_out_time,
        );

        const finalEarly = Math.max(0, earlyMin);
        punch.early_hours = finalEarly / 60;
        totalEarly += finalEarly;
      } else {
        punch.miss_check_out = true;
      }

      // 3. QUAN TRỌNG: Bỏ flag 'is_invalid_workday'
      // Vì đi muộn 1 phút vẫn có thể được tính công tỷ lệ hoặc công đủ nếu làm bù.
      punch['is_invalid_workday'] = false;
    }

    context.totalLateMinutes = totalLate;
    context.totalEarlyMinutes = totalEarly;
  }

  private getShiftTimeOnDate(targetDate: Date, shiftTime: any): Date {
    const result = new Date(targetDate);
    // Xử lý cả trường hợp shiftTime là Date hoặc string "HH:mm"
    if (typeof shiftTime === 'string') {
      const [h, m] = shiftTime.split(':').map(Number);
      result.setHours(h, m, 0, 0);
    } else {
      result.setHours(shiftTime.getHours(), shiftTime.getMinutes(), 0, 0);
    }
    return result;
  }
}
