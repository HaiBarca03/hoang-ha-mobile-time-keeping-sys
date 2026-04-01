import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculationContext } from '../dto/calculation-context.dto';
import {
  AttendanceRequest,
  RequestType,
} from '../../../approval-management/entities/attendance-request.entity';
import { RequestStatus } from 'src/constants/approval-status.constants';
import { differenceInMinutes, isBefore, max, min } from 'date-fns';

@Injectable()
export class LeaveStrategy {
  private readonly logger = new Logger(LeaveStrategy.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
  ) { }

  async process(context: CalculationContext): Promise<void> {
    const { employee, date, shiftContext, punches } = context;
    if (!shiftContext?.rule) return;

    // 1. TRUY VẤN CÁC ĐƠN NGHỈ PHÉP (LEAVE) ĐÃ DUYỆT TRONG NGÀY
    const leaveRequests = await this.requestRepo.find({
      where: {
        employee_id: employee.id,
        type: RequestType.LEAVE,
        status: RequestStatus.APPROVED,
        applied_date: date,
      },
      relations: ['detail_time_off', 'leave_type'],
    });

    let totalLeaveMinutes = 0;

    if (leaveRequests && leaveRequests.length > 0) {
      const shiftIn = this.combine(date, shiftContext.rule.onTime);
      const shiftOut = this.combine(date, shiftContext.rule.offTime);

      for (const req of leaveRequests) {
        const detail = req.detail_time_off;
        if (!detail) continue;

        const resStart = new Date(detail.start_time);
        const resEnd = new Date(detail.end_time);

        // --- Logic: leave_overlap_time = min(result.End, shift.Out) - max(result.Start, shift.In) ---
        const leaveOverlapStart = max([resStart, shiftIn]);
        const leaveOverlapEnd = min([resEnd, shiftOut]);

        if (isBefore(leaveOverlapStart, leaveOverlapEnd)) {
          let leaveOverlapTime = differenceInMinutes(
            leaveOverlapEnd,
            leaveOverlapStart,
          );

          // --- Logic: rest_overlap_time (Trừ giờ nghỉ trưa nằm trong khoảng xin nghỉ) ---
          let restOverlapTime = 0;
          for (const rule of shiftContext.restRules) {
            const restStart = this.combine(date, rule.restBeginTime);
            const restEnd = this.combine(date, rule.restEndTime);

            const oRestStart = max([resStart, restStart]);
            const oRestEnd = min([resEnd, restEnd]);

            if (isBefore(oRestStart, oRestEnd)) {
              restOverlapTime += differenceInMinutes(oRestEnd, oRestStart);
            }
          }

          // Tổng thời gian ghi nhận = leave_overlap_time - rest_overlap_time
          const finalMinutes =
            leaveOverlapTime > restOverlapTime
              ? leaveOverlapTime - restOverlapTime
              : 0;
          totalLeaveMinutes += finalMinutes;

          // Lưu loại phép chính để hiển thị (nếu cần)
          context['leaveTypeCode'] = req.leave_type?.code;
        }
      }
    }

    // 2. LOGIC NGHỈ KHÔNG PHÉP (LACK CẢ NGÀY VÀ KHÔNG CÓ ĐƠN)
    const punch = punches[0];
    const isLackAllDay = punch?.miss_check_in && punch?.miss_check_out;

    if (isLackAllDay && totalLeaveMinutes === 0) {
      this.logger.warn(
        `Nhân viên ${employee.id} nghỉ không phép (Lack All Day & No Requests)`,
      );

      const shiftMinutes = shiftContext.getStandardWorkHours() * 60;
      // Ghi nhận số giờ nghỉ không phép (Bằng đúng số giờ làm việc chuẩn của ca)
      context.leaveHours = shiftMinutes / 60;
      context.leaveValue = 0; // Nghỉ không phép thì 0 công
      context['isUnpaidLeave'] = true;
    } else {
      // Ghi nhận số giờ nghỉ có phép đã tính được
      context.leaveHours = totalLeaveMinutes / 60;

      // Tính leaveValue (công nghỉ) dựa trên cấu hình loại phép (tùy thuộc vào business của bạn có trả lương hay không)
      // Ở đây tạm tính theo tỷ lệ:
      const standardMinutes = shiftContext.getStandardWorkHours() * 60;
      context.leaveValue =
        Math.round((totalLeaveMinutes / standardMinutes) * 100) / 100;
    }

    this.logger.debug(
      `Leave Result: ${context.leaveHours}h, Value: ${context.leaveValue}`,
    );
  }

  private combine(date: Date, timeInput: any): Date {
    const d = new Date(date);
    if (timeInput instanceof Date) {
      d.setHours(timeInput.getHours(), timeInput.getMinutes(), 0, 0);
    } else if (typeof timeInput === 'string') {
      const [h, m] = timeInput.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d;
  }
}
