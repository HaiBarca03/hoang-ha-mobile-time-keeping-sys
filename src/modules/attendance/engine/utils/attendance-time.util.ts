import { differenceInMinutes } from 'date-fns';

export class AttendanceTimeUtil {
  /**
   * Kết hợp ngày và giờ nhập vào (string dạng HH:mm hoặc Date) thành một đối tượng Date mới.
   */
  static combine(date: Date, timeInput: string | Date): Date {
    const d = new Date(date);
    if (timeInput instanceof Date) {
      d.setHours(timeInput.getHours(), timeInput.getMinutes(), 0, 0);
    } else if (typeof timeInput === 'string') {
      const [h, m] = timeInput.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d;
  }

  /**
   * Chuyển đổi số phút sang số giờ với độ chính xác chỉ định (mặc định 2 chữ số thập phân).
   */
  static minutesToHours(minutes: number, decimals: number = 2): number {
    return this.roundTo(minutes / 60, decimals);
  }

  /**
   * Làm tròn số đến số chữ số thập phân chỉ định.
   */
  static roundTo(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Tính toán độ lệch thời gian giữa check-in/out với giờ ca chuẩn.
   */
  static getDiffMinutes(target: Date, base: Date): number {
    return differenceInMinutes(target, base);
  }

  /**
   * Định dạng Date thành chuỗi yyyy-MM-dd
   */
  static formatDate(date: Date): string {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();

    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }

  /**
   * Định dạng thời gian sang kiểu Việt Nam (UTC+7)
   */
  static formatTimeToVietnam(date?: Date | string | null): string {
    if (!date) return '--';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '--';

    const hours = d.getUTCHours() + 7;
    const finalHours = hours >= 24 ? hours - 24 : hours;
    const minutes = d.getUTCMinutes();

    return `${finalHours}h${minutes.toString().padStart(2, '0')}`;
  }
}
