import { ShiftRestRule } from 'src/modules/master-data/entities/shift-rest-rule.entity';
import { Shift } from 'src/modules/master-data/entities/shift.entity';

export class ShiftContext {
  shift?: Shift;
  restRules: ShiftRestRule[] = [];

  constructor(shift?: Shift) {
    if (shift) {
      this.shift = shift;
      this.restRules = shift.restRule ? [shift.restRule] : [];
    }
  }

  get rule() {
    if (this.shift) {
      return {
        onTime: this.shift.startTime,
        offTime: this.shift.endTime,
        allowLateMinutes: this.shift.allowLateMinutes ?? 0,
        allowEarlyMinutes: this.shift.allowEarlyMinutes ?? 0,
      };
    }
    return null;
  }

  getStandardWorkHours(): number {
    return this.shift?.shiftHours ?? 8;
  }

  isRestTime(time: string): boolean {
    const current = this.toMinutes(time);
    return this.restRules.some((rest) => {
      if (!rest.restBeginTime || !rest.restEndTime) return false;
      const begin = this.toMinutes(rest.restBeginTime);
      const end = this.toMinutes(rest.restEndTime);
      return current >= begin && current <= end;
    });
  }

  private toMinutes(time: string): number {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
}
