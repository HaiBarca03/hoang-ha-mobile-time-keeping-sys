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
import { OvertimeConversionCode } from 'src/constants/overtime-conversion.enum';

@Injectable()
export class OvertimeStrategy {
  private readonly logger = new Logger(OvertimeStrategy.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
  ) { }

  async process(context: CalculationContext): Promise<void> {
    const { employee, date, punches, shiftContext } = context;
    const punch = punches[0];

    // Nếu không có quẹt thẻ ra hoặc không có ca thì không tính OT theo logic overlap
    if (!punch?.check_out_time || !shiftContext?.rule) return;

    const request = await this.requestRepo.findOne({
      where: {
        employee_id: employee.id,
        type: RequestType.OVERTIME,
        status: RequestStatus.APPROVED,
        applied_date: date,
      },
      relations: ['detail_overtime'],
    });

    if (!request?.detail_overtime) return;

    const detail = request.detail_overtime;

    // FIX 2: Truyền đúng biến vào hàm combine đã được sửa đổi bên dưới
    const shiftOut = this.combine(date, shiftContext.rule.offTime);
    const checkOutRecord = punch.check_out_time;
    const resStart = new Date(detail.start_time);
    const resEnd = new Date(detail.end_time);

    // 1. ot_overlap_time = min(result.End, check_out_record) - max(result.Start, shift.Out)
    // FIX 3: Dùng cú pháp mảng cho max/min của date-fns
    const otOverlapStart = max([resStart, shiftOut]);
    const otOverlapEnd = min([resEnd, checkOutRecord]);

    const otOverlapTime = isBefore(otOverlapStart, otOverlapEnd)
      ? differenceInMinutes(otOverlapEnd, otOverlapStart)
      : 0;

    // 2. Tổng thời gian ghi nhận = ot_overlap_time (nếu > 0)
    if (otOverlapTime > 0) {
      context.overtimeMinutes = otOverlapTime;
      context['ot_ratio'] = detail.ratio_convert;

      if (detail.convert_type === OvertimeConversionCode.COMPENSATORY_LEAVE) {
        context.overtimeCompensatoryMinutes = otOverlapTime;
      }

      this.logger.debug(
        `OT Minutes detected: ${otOverlapTime} for employee ${employee.id}`,
      );
    }
  }

  // FIX 4: Sửa hàm combine để nhận cả string lẫn Date
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
