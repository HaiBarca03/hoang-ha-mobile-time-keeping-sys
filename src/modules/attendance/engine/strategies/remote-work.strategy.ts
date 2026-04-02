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
import { AttendanceTimeUtil } from '../utils/attendance-time.util';

@Injectable()
export class RemoteWorkStrategy {
  private readonly logger = new Logger(RemoteWorkStrategy.name);

  constructor(
    @InjectRepository(AttendanceRequest)
    private requestRepo: Repository<AttendanceRequest>,
  ) { }

  async process(context: CalculationContext): Promise<void> {
    const { employee, date, shiftContext } = context;
    if (!shiftContext?.rule) return;

    const request = await this.requestRepo.findOne({
      where: {
        employee_id: employee.id,
        type: RequestType.REMOTE,
        status: RequestStatus.APPROVED,
        applied_date: date,
      },
      relations: ['detail_time_off'],
    });

    if (!request?.detail_time_off) return;

    const detail = request.detail_time_off;

    // SỬA: Đảm bảo truyền đúng kiểu string vào hàm combine
    const shiftIn = AttendanceTimeUtil.combine(date, shiftContext.rule.onTime);
    const shiftOut = AttendanceTimeUtil.combine(date, shiftContext.rule.offTime);

    const resStart = new Date(detail.start_time);
    const resEnd = new Date(detail.end_time);

    // 1. remote_overlap_time = min(result.End, shift.Out) - max(result.Start, shift.In)
    // SỬA: date-fns max/min nhận vào một mảng các Date [Date, Date]
    const remoteOverlapStart = max([resStart, shiftIn]);
    const remoteOverlapEnd = min([resEnd, shiftOut]);

    let remoteOverlapTime = isBefore(remoteOverlapStart, remoteOverlapEnd)
      ? differenceInMinutes(remoteOverlapEnd, remoteOverlapStart)
      : 0;

    if (remoteOverlapTime > 0) {
      // 2. rest_overlap_time = min(result.End, rest.End) - max(result.Start, rest.Start)
      let restOverlapTime = 0;
      for (const rule of shiftContext.restRules) {
        // Kiểm tra an toàn cho restBeginTime và restEndTime
        if (!rule.restBeginTime || !rule.restEndTime) continue;

        const restStart = AttendanceTimeUtil.combine(date, rule.restBeginTime);
        const restEnd = AttendanceTimeUtil.combine(date, rule.restEndTime);

        const oRestStart = max([resStart, restStart]);
        const oRestEnd = min([resEnd, restEnd]);

        if (isBefore(oRestStart, oRestEnd)) {
          restOverlapTime += differenceInMinutes(oRestEnd, oRestStart);
        }
      }

      // 3. Tổng thời gian ghi nhận = remote_overlap_time - rest_overlap_time
      const finalMinutes =
        remoteOverlapTime > restOverlapTime
          ? remoteOverlapTime - restOverlapTime
          : 0;

      context.onlineValue = AttendanceTimeUtil.minutesToHours(finalMinutes);
      this.logger.debug(
        `Remote hours for ${employee.id}: ${context.onlineValue}`,
      );
    }
  }
}
