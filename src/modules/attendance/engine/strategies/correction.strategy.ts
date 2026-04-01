import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculationContext } from '../dto/calculation-context.dto';
import {
  AttendanceRequest,
  RequestType,
} from '../../../approval-management/entities/attendance-request.entity';
import { RequestStatus } from 'src/constants/approval-status.constants';

@Injectable()
export class CorrectionStrategy {
  private readonly logger = new Logger(CorrectionStrategy.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
  ) { }

  async process(context: CalculationContext): Promise<void> {
    const { employee, date, punches } = context;
    const punch = punches[0]; // Thường xử lý cặp vào-ra đầu tiên

    if (!punch) return;

    // 1. Tìm các đơn điều chỉnh công (CORRECTION) đã được duyệt cho ngày này
    const correctionRequests = await this.requestRepo.find({
      where: {
        employee_id: employee.id,
        type: RequestType.CORRECTION,
        status: RequestStatus.APPROVED,
        applied_date: date,
      },
      relations: ['detail_adjustment'],
    });

    if (!correctionRequests || correctionRequests.length === 0) return;

    this.logger.log(
      `Found ${correctionRequests.length} correction requests for employee ${employee.id}`,
    );

    for (const req of correctionRequests) {
      const detail = req.detail_adjustment;
      if (!detail || !detail.replenishment_time) continue;

      // Logic: Nếu phiếu là Check-in -> Ghi đè vào check_in_time
      // Dựa trên metadata hoặc field trong detail (Giả sử bạn dùng raw_data hoặc một field phân biệt)
      // Ở đây mình check dựa trên nội dung đơn hoặc logic của bạn:

      const adjustmentType = req.raw_data?.adjustment_type; // "Check-in" hoặc "Check-out"

      if (adjustmentType === 'Check-in') {
        this.logger.debug(
          `Overriding Check-in: ${punch.check_in_time} -> ${detail.replenishment_time}`,
        );
        punch.check_in_time = new Date(detail.replenishment_time);
        punch.miss_check_in = false;
        punch.check_in_result = 'Normal';
      } else if (adjustmentType === 'Check-out') {
        this.logger.debug(
          `Overriding Check-out: ${punch.check_out_time} -> ${detail.replenishment_time}`,
        );
        punch.check_out_time = new Date(detail.replenishment_time);
        punch.miss_check_out = false;
        punch.check_out_result = 'Normal';
      }
    }
  }
}
