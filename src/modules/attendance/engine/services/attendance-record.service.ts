import { Injectable } from "@nestjs/common";
import { RawPunchInputDto } from "../dto/raw-punch.input";

@Injectable()
export class AttendanceRecordService {
  flattenLarkPunches(larkData: any, companyId: string): RawPunchInputDto[] {
    const flattenedPunches: RawPunchInputDto[] = [];

    larkData.user_task_results.forEach(userTask => {
      userTask.records.forEach(record => {
        const day = userTask.day;
        flattenedPunches.push(this.mapToRawPunch(userTask, record, 'IN', companyId, day));
        flattenedPunches.push(this.mapToRawPunch(userTask, record, 'OUT', companyId, day));
        // if (record.check_in_record?.record_id) {
        // }

        // if (record.check_out_record?.record_id) {
        // }
      });
    });

    return flattenedPunches;
  }

  private mapToRawPunch(userTask: any, record: any, type: 'IN' | 'OUT', companyId: string, day: number): RawPunchInputDto {
    const isCheckIn = type === 'IN';
    const larkRecord = isCheckIn ? record.check_in_record : record.check_out_record;
    const result = isCheckIn ? record.check_in_result : record.check_out_result;
    const targetShiftTime = isCheckIn ? record.check_in_shift_time : record.check_out_shift_time;

    const defaultPunchTime = `${String(day).substring(0, 4)}-${String(day).substring(4, 6)}-${String(day).substring(6, 8)}T00:00:00.000Z`;

    return {
      company_id: companyId,
      external_user_id: userTask.user_id,
      punch_time: larkRecord?.check_time ? new Date(parseInt(larkRecord.check_time) * 1000).toISOString() : defaultPunchTime,
      lark_record_id: larkRecord?.record_id || `VIRTUAL_${type}_${userTask.result_id}`,
      punch_type: type,
      day: day,
      punch_result: result,
      source_type: larkRecord ? (larkRecord.is_wifi ? 'WIFI' : 'GPS') : undefined,
      latitude: larkRecord?.latitude,
      longitude: larkRecord?.longitude,
      address: larkRecord?.location_name,
      device_id: larkRecord?.device_id,
      ssid: larkRecord?.ssid,
      photo_url: larkRecord?.photo_urls?.[0] || undefined,
      shift_time_target: targetShiftTime ? new Date(parseInt(targetShiftTime) * 1000).toISOString() : undefined,
      raw_payload: record, // Lưu toàn bộ record phòng khi larkRecord rỗng
    };
  }
}