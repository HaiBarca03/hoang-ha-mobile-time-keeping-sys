import { Injectable, Logger } from '@nestjs/common';
import { CalculationContext } from '../dto/calculation-context.dto';
import { differenceInMinutes, isBefore, isAfter, max, min } from 'date-fns';

@Injectable()
export class BreakTimeStrategy {
  private readonly logger = new Logger(BreakTimeStrategy.name);

  process(context: CalculationContext): void {
    // 1. Lấy quy tắc nghỉ từ ca (đã được ShiftResolverService nạp vào context)
    const restRules = context.shiftContext?.restRules || [];
    if (restRules.length === 0) return;

    let totalRestMinutes = 0;

    // 2. Duyệt qua các cặp quẹt thẻ (thường chỉ có 1 cặp do PunchProcessingStrategy xử lý)
    for (const punch of context.punches) {
      // Ưu tiên check_in_time vì đây là kết quả cuối của bước xử lý punch
      const punchIn = punch.check_in_time;
      const punchOut = punch.check_out_time;

      if (!punchIn || !punchOut) continue;

      for (const rule of restRules) {
        if (!rule.restBeginTime || !rule.restEndTime) continue;

        const restStart = this.parseTimeToDate(
          context.date,
          rule.restBeginTime,
        );
        const restEnd = this.parseTimeToDate(context.date, rule.restEndTime);

        // Tính giao điểm giữa thời gian có mặt và thời gian nghỉ quy định
        const overlapStart = max([punchIn, restStart]);
        const overlapEnd = min([punchOut, restEnd]);

        if (isBefore(overlapStart, overlapEnd)) {
          const overlapMinutes = differenceInMinutes(overlapEnd, overlapStart);
          totalRestMinutes += overlapMinutes;
        }
      }
    }

    // 3. Đẩy kết quả ngược lại context
    context.holidayTime = totalRestMinutes; // Hoặc thêm field totalRestMinutes riêng vào context

    this.logger.debug(
      `[BreakTime] Khấu trừ nghỉ giữa ca: ${totalRestMinutes} phút`,
    );
  }

  private parseTimeToDate(baseDate: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
}
