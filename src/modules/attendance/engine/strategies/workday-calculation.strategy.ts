import { Injectable, Logger } from '@nestjs/common';
import { CalculationContext } from '../dto/calculation-context.dto';
import { differenceInMinutes, max, min, isBefore } from 'date-fns';
import { AttendanceTimeUtil } from '../utils/attendance-time.util';

@Injectable()
export class WorkdayCalculationStrategy {
  private readonly logger = new Logger(WorkdayCalculationStrategy.name);

  process(context: CalculationContext): void {
    const { shiftContext, punches, date } = context;
    if (!shiftContext?.rule) return;

    const standardHours = shiftContext.getStandardWorkHours();
    const standardMinutes = standardHours * 60;

    let totalActualWorkMinutes = 0;

    // 1. LOGIC: TỔNG GIỜ LÀM VIỆC THỰC TẾ (Đã trừ nghỉ giữa ca theo quẹt thẻ)
    for (const punch of punches) {
      const checkIn = punch.check_in_time;
      const checkOut = punch.check_out_time;

      if (checkIn && checkOut) {
        // a. Tổng giờ làm việc chưa trừ nghỉ = check_out - check_in
        let durationMinutes = differenceInMinutes(checkOut, checkIn);
        if (durationMinutes < 0) durationMinutes = 0;

        // b. Thời gian nghỉ giữa ca thực tế = min(check_out, rest_end) - max(check_in, rest_begin)
        let actualRestOverlapMinutes = 0;
        for (const rest of shiftContext.restRules) {
          if (!rest.restBeginTime || !rest.restEndTime) continue;

          const restStart = AttendanceTimeUtil.combine(date, rest.restBeginTime);
          const restEnd = AttendanceTimeUtil.combine(date, rest.restEndTime);

          const overlapStart = max([checkIn, restStart]);
          const overlapEnd = min([checkOut, restEnd]);

          if (isBefore(overlapStart, overlapEnd)) {
            actualRestOverlapMinutes += differenceInMinutes(
              overlapEnd,
              overlapStart,
            );
          }
        }

        // c. Tổng giờ làm việc thực tế = Chưa trừ nghỉ - Nghỉ giữa ca thực tế
        const netMinutes = Math.max(
          0,
          durationMinutes - actualRestOverlapMinutes,
        );
        totalActualWorkMinutes += netMinutes;
      }
    }

    context.totalWorkedHours = AttendanceTimeUtil.minutesToHours(
      totalActualWorkMinutes,
    );

    // 2. LOGIC: CÔNG THỰC TẾ GHI NHẬN (workedWorkday)
    // Công thực tế ghi nhận = Tổng giờ làm việc thực tế / Số giờ làm việc theo ca
    let workedWorkday = totalActualWorkMinutes / standardMinutes;

    // Giới hạn trong khoảng [0, 1]
    if (workedWorkday > 1) workedWorkday = 1;
    if (workedWorkday < 0) workedWorkday = 0;

    // 3. LOGIC: TỔNG CÔNG NGÀY
    // Tổng công ngày = Công thực tế ghi nhận + Công nghỉ phép + Công làm việc từ xa (OnlineValue)
    // Lưu ý: onlineValue và leaveValue đã được tính ở các Strategy trước
    const leaveContribution = context.leaveValue || 0;
    const remoteContribution = context.onlineValue || 0;

    // Nếu đã đạt công ngày tối đa (1), không cộng remoteContribution để tránh tính thừa
    const effectiveRemote = workedWorkday >= 1 ? 0 : remoteContribution;

    let totalFinalWorkday =
      workedWorkday + leaveContribution + effectiveRemote;

    // Giới hạn trong khoảng [0, 1] và làm tròn 2 chữ số thập phân
    if (totalFinalWorkday > 1) totalFinalWorkday = 1;
    if (totalFinalWorkday < 0) totalFinalWorkday = 0;

    context.finalActualWorkday = AttendanceTimeUtil.roundTo(totalFinalWorkday);

    this.logger.debug(
      `[CALC] ID: ${context.employee.id} | RealWork: ${workedWorkday.toFixed(2)} | ` +
      `Leave: ${leaveContribution} | Remote: ${remoteContribution} | Final: ${context.finalActualWorkday}`,
    );
  }
}
