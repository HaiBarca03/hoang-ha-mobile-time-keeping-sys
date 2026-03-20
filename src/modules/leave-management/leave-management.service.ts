import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AttendanceRequest,
  RequestType,
} from './entities/attendance-request.entity';
import { RequestDetailTimeOff } from './entities/request-detail-time-off.entity';
import { Employee } from '../master-data/entities/employee.entity';
import { LeaveType } from '../master-data/entities/leave-type.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from 'src/constants';
import { AttendanceDailyTimesheet } from '../attendance/entities/attendance-daily-timesheet.entity';
import { RequestDetailOvertime } from './entities/request-detail-overtime.entity';
import { RequestDetailAdjustment } from './entities/request-detail-adjustment.entity';

@Injectable()
export class LeaveManagementService {
  private readonly logger = new Logger(LeaveManagementService.name);

  constructor(
    private dataSource: DataSource,

    @InjectQueue(QUEUE_NAMES.CALCULATE_DAILY)
    private attendanceQueue: Queue,
  ) {}

  async importFromExternalSource(payload: any, companyId: string) {
    this.logger.log(`>>> BẮT ĐẦU IMPORT: companyId=${companyId}`);

    const item = payload?.result || payload?.data?.items?.[0];
    if (!item) {
      this.logger.error('!!! THẤT BẠI: Không tìm thấy dữ liệu hợp lệ');
      return { success: false, message: 'No data found' };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const externalEmployeeCode = item.User_id?.[0]?.text;
      const leaveTypeName = item['Leave type'];
      const record_id = item.SourceID;
      const approvalProcess = item['Approval process'];

      // 1. Tìm Employee
      const employee = await queryRunner.manager.findOne(Employee, {
        where: { userId: externalEmployeeCode, companyId: companyId },
      });

      if (!employee) {
        this.logger.warn(
          `!!! THẤT BẠI: Không tìm thấy Employee ${externalEmployeeCode}`,
        );
        await queryRunner.rollbackTransaction();
        return { success: false, message: `Employee not found` };
      }

      // 2. Xác định RequestType dựa trên Approval process
      let type = RequestType.LEAVE;
      if (approvalProcess.includes('tăng ca')) type = RequestType.OVERTIME;
      else if (approvalProcess.includes('điều chỉnh'))
        type = RequestType.CORRECTION;

      // 3. Xử lý thời gian
      const startTime = new Date(item['Start time']);
      const endTime = new Date(item['End time']);
      const dateString = startTime.toISOString().split('T')[0];

      // 4. Tìm/Tạo đơn AttendanceRequest
      let request = await queryRunner.manager.findOne(AttendanceRequest, {
        where: { record_id: record_id },
      });
      if (!request) {
        request = new AttendanceRequest();
        request.record_id = record_id;
      }

      request.request_id = item['Request No.']?.text;
      request.employee_id = employee.id;
      request.company_id = companyId;
      request.status = item.Status;
      request.type = type;
      request.applied_date = startTime;
      request.total_hours = parseFloat(item.Duration) || 0;
      request.raw_data = item;
      request.note = item['Reason for leave']?.trim();

      // Tìm LeaveType (nếu có)
      const leaveType = await queryRunner.manager.findOne(LeaveType, {
        where: { leaveTypeName: leaveTypeName, companyId: companyId },
      });
      request.leave_type_id = leaveType?.id || null;

      const savedRequest = await queryRunner.manager.save(request);

      // 5. XỬ LÝ LƯU BẢNG DETAIL TƯƠNG ỨNG
      if (type === RequestType.LEAVE) {
        let detail = await queryRunner.manager.findOne(RequestDetailTimeOff, {
          where: { attendance_request_id: savedRequest.id },
        });
        if (!detail) detail = new RequestDetailTimeOff();

        detail.attendance_request_id = savedRequest.id;
        detail.start_time = startTime;
        detail.end_time = endTime;
        detail.hours = savedRequest.total_hours;
        detail.leave_type_id = savedRequest.leave_type_id;
        detail.leave_type_details = leaveTypeName;
        await queryRunner.manager.save(detail);
      } else if (type === RequestType.OVERTIME) {
        let otDetail = await queryRunner.manager.findOne(
          RequestDetailOvertime,
          {
            where: { attendance_request_id: savedRequest.id },
          },
        );
        if (!otDetail) otDetail = new RequestDetailOvertime();

        otDetail.attendance_request_id = savedRequest.id;
        otDetail.start_time = startTime;
        otDetail.end_time = endTime;
        otDetail.ot_rule_id = 1; // Default rule
        otDetail.hours_ratio = savedRequest.total_hours;
        await queryRunner.manager.save(otDetail);
      } else if (type === RequestType.CORRECTION) {
        let adjDetail = await queryRunner.manager.findOne(
          RequestDetailAdjustment,
          {
            where: { attendance_request_id: savedRequest.id },
          },
        );
        if (!adjDetail) adjDetail = new RequestDetailAdjustment();

        adjDetail.attendance_request_id = savedRequest.id;
        adjDetail.replenishment_time = startTime; // Giờ bổ sung
        await queryRunner.manager.save(adjDetail);
      }

      await queryRunner.commitTransaction();

      // 6. KIỂM TRA TIMESHEET ĐỂ PUSH QUEUE
      const existingTimesheet = await queryRunner.manager.findOne(
        AttendanceDailyTimesheet,
        {
          where: { employee_id: employee.id, attendance_date: startTime },
        },
      );

      if (existingTimesheet) {
        await this.attendanceQueue.add(
          JOB_NAMES.CALCULATE_DAILY,
          { employee_id: employee.id, date: startTime },
          {
            jobId: `calc-${employee.id}-${dateString}`,
            removeOnComplete: true,
          },
        );
      }

      return { success: true, requestId: savedRequest.id };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('!!! LỖI:', error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
