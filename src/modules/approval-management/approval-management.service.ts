import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  AttendanceRequest,
  RequestType,
} from './entities/attendance-request.entity';
import { RequestDetailTimeOff } from './entities/request-detail-time-off.entity';
import { Employee } from '../master-data/entities/employee.entity';
import { LeaveType } from '../master-data/entities/leave-type.entity';
import { AttendanceEngine } from '../attendance/engine/attendance.engine';
import { RequestDetailOvertime } from './entities/request-detail-overtime.entity';
import { RequestDetailAdjustment } from './entities/request-detail-adjustment.entity';
import { RequestStatus } from 'src/constants/approval-status.constants';
import { OvertimeConversionCode } from 'src/constants/overtime-conversion.enum';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ApprovalManagementService {
  private readonly logger = new Logger(ApprovalManagementService.name);

  constructor(
    private dataSource: DataSource,
    private attendanceEngine: AttendanceEngine,

    @InjectRepository(AttendanceRequest)
    private readonly attendanceRepository: Repository<AttendanceRequest>,
  ) {}

  async importFromExternalSource(payload: any, companyId: string) {
    this.logger.log(`>>> BẮT ĐẦU IMPORT: companyId=${companyId}`);

    const items: any[] = Array.isArray(payload?.result)
      ? payload.result
      : payload?.result
        ? [payload.result]
        : payload?.recordId || payload?.SourceID
          ? [payload]
          : payload?.data?.items || [];

    this.logger.log(`>>> Số lượng bản ghi nhận được: ${items.length}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Dùng Map để tránh trùng lặp task (Key: employeeId_YYYY-MM-DD)
    const taskMap = new Map<string, { employeeId: string; date: Date }>();

    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as { record_id: string; message: string }[],
    };

    try {
      for (const item of items) {
        // --- Chuẩn hoá fields từ Unified Schema ---
        // Hỗ trợ cả trường hợp dữ liệu bị bọc thêm 1 lớp "result" (item.result)
        const fields = item.result || item;

        const record_id =
          fields.recordId || fields.SourceID || fields.record_id;
        const typeRaw = fields.Type || fields.approval_process || '';
        const externalUserId =
          fields.RequesterID ||
          fields.Requester?.[0]?.id ||
          fields.fields?.['Người lập phiếu']?.[0]?.id;
        const detailType =
          fields.DetailType ||
          fields['Leave type'] ||
          fields.fields?.['Chi tiết loại nghỉ'] ||
          '';
        const statusRaw = (
          fields.Status ||
          fields.fields?.['Trạng thái duyệt'] ||
          ''
        )
          .toString()
          .toLowerCase();
        const requestNoText =
          fields.RequestNo ||
          fields['Request No.']?.text ||
          fields.fields?.['Mã đơn']?.[0]?.text;
        const note = fields.Note || fields.fields?.['Ghi chú'] || detailType;

        const startTime = this.parseTimestamp(
          fields.StartTime ||
            fields['Start time'] ||
            fields.fields?.['Thời gian bắt đầu'],
        );
        const endTime = this.parseTimestamp(
          fields.EndTime ||
            fields['End time'] ||
            fields.fields?.['Thời gian kết thúc'],
        );
        const totalHours =
          fields.Duration || fields.fields?.['Số giờ nghỉ'] || 0;
        const adjustmentTime = fields.AdjustmentTime
          ? this.parseTimestamp(fields.AdjustmentTime)
          : null;

        this.logger.log(
          `--- Đang xử lý record_id: ${record_id} [${typeRaw}] ---`,
        );

        const employee = await queryRunner.manager.findOne(Employee, {
          where: { userId: externalUserId, companyId: companyId },
        });

        if (!employee) {
          const errMsg = `Không tìm thấy Employee với userId ${externalUserId}`;
          this.logger.warn(`!!! THẤT BẠI: ${errMsg}`);
          results.failureCount++;
          results.errors.push({ record_id, message: errMsg });
          continue;
        }

        // Xác định loại đơn (RequestType enum)
        let type = RequestType.LEAVE;
        const typeStr = typeRaw.toUpperCase();
        if (typeStr.includes('OVERTIME') || typeStr.includes('TĂNG CA'))
          type = RequestType.OVERTIME;
        else if (typeStr.includes('REMOTE')) type = RequestType.REMOTE;
        else if (
          typeStr.includes('CORRECTION') ||
          typeStr.includes('ĐIỀU CHỈNH')
        )
          type = RequestType.CORRECTION;

        // Tìm loại nghỉ nếu là LEAVE
        let leaveType: LeaveType | null = null;
        if (type === RequestType.LEAVE && detailType) {
          leaveType = await queryRunner.manager.findOne(LeaveType, {
            where: { leaveTypeName: detailType, companyId: companyId },
          });
        }

        let request = await queryRunner.manager.findOne(AttendanceRequest, {
          where: { record_id: record_id },
        });

        const oldStatus = request?.status?.toLowerCase();

        if (!request) {
          request = new AttendanceRequest();
          request.record_id = record_id;
        }

        const isApproved = statusRaw === RequestStatus.APPROVED;
        const wasApproved = oldStatus === RequestStatus.APPROVED;
        const isRejected = statusRaw === RequestStatus.REJECTED;

        // Fallback: Nếu không có mã đơn thì dùng record_id để tránh lỗi NULL trong DB
        request.request_id = requestNoText || record_id;
        request.employee_id = employee.id;
        request.company_id = companyId;
        request.status = statusRaw;
        request.note = note;
        request.type = type;
        request.applied_date = startTime;
        request.total_hours = totalHours;
        request.leave_type_id = leaveType?.id || null;
        request.is_counted = isApproved;
        request.raw_data = item;

        const savedRequest = await queryRunner.manager.save(request);

        // 5. XỬ LÝ LƯU BẢNG DETAIL TƯƠNG ỨNG
        if (type === RequestType.LEAVE || type === RequestType.REMOTE) {
          let detail = await queryRunner.manager.findOne(RequestDetailTimeOff, {
            where: { attendance_request_id: savedRequest.id },
          });
          if (!detail) detail = new RequestDetailTimeOff();
          detail.attendance_request_id = savedRequest.id;
          detail.start_time = startTime;
          detail.end_time = endTime;
          detail.hours = savedRequest.total_hours;
          detail.leave_type_id = savedRequest.leave_type_id;
          detail.leave_type_details =
            type === RequestType.REMOTE ? 'Remote Work' : detailType;
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
          otDetail.hours_ratio = savedRequest.total_hours;

          // Phân loại OT: Tăng ca (PAYMENT) vs Nghỉ bù (COMPENSATORY_LEAVE)
          if (
            detailType.includes('Nghỉ bù') ||
            detailType.includes('Nghĩ bù')
          ) {
            otDetail.convert_type = OvertimeConversionCode.COMPENSATORY_LEAVE;
          } else {
            otDetail.convert_type = OvertimeConversionCode.PAYMENT;
          }
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
          adjDetail.replenishment_time = adjustmentTime || startTime;
          await queryRunner.manager.save(adjDetail);
        }

        // Gom danh sách ngày cần tính toán lại
        if (isApproved || (isRejected && wasApproved)) {
          const today = new Date();
          today.setHours(23, 59, 59, 999);

          let tempDate = new Date(startTime);
          while (tempDate <= endTime) {
            if (tempDate <= today) {
              const dateStr = tempDate.toISOString().split('T')[0];
              const key = `${employee.id}_${dateStr}`;
              if (!taskMap.has(key)) {
                taskMap.set(key, {
                  employeeId: employee.id,
                  date: new Date(tempDate),
                });
              }
            }
            tempDate.setDate(tempDate.getDate() + 1);
          }
        }
        results.successCount++;
      }

      this.logger.log(`>>> CHUẨN BỊ COMMIT TRANSACTION....`);
      await queryRunner.commitTransaction();
      this.logger.log(`>>> TRANSACTION DONE!`);

      // 6. BẮN LỆNH TÍNH TOÁN NGẦM (Fire and Forget)
      const tasksToRecalc = Array.from(taskMap.values());
      tasksToRecalc.forEach((task) => {
        this.attendanceEngine
          .calculateDailyForEmployee(task.employeeId, task.date)
          .then(() => {
            this.logger.log(
              `[SYNC CALC DONE] Employee ${task.employeeId} on ${task.date.toISOString().split('T')[0]}`,
            );
          })
          .catch((err) => {
            this.logger.error(
              `[SYNC CALC ERROR] Failed for ${task.employeeId}: ${err.message}`,
            );
          });
      });

      return {
        success: results.failureCount === 0,
        message: `Processed ${items.length} items: ${results.successCount} succeeded, ${results.failureCount} failed.`,
        data: results,
      };
    } catch (error) {
      this.logger.error('!!! LỖI TRONG QUÁ TRÌNH XỬ LÝ - ROLLBACK');
      await queryRunner.rollbackTransaction();
      this.logger.error(error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private parseTimestamp = (time: any) => {
    if (!time) return new Date();
    if (typeof time === 'string' && !isNaN(Number(time))) {
      return new Date(Number(time));
    }
    return new Date(time);
  };

  async findAllByCompany(companyId: string) {
    const data = await this.attendanceRepository.find({
      where: { company_id: companyId },
      take: 10,
    });

    return {
      message: 'Dữ liệu query từ DB (Check UTC)',
      currentTimeZone: process.env.TZ,
      data: data,
    };
  }
}
