import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift } from 'src/modules/master-data/entities/shift.entity';
import { ShiftContext } from '../dto/shift-context.dto';
import { CalculationContext } from '../dto/calculation-context.dto';

@Injectable()
export class ShiftResolverService {
  private readonly logger = new Logger(ShiftResolverService.name);

  constructor(
    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,
  ) { }

  async resolveShift(context: CalculationContext): Promise<ShiftContext> {
    const { employee } = context;
    console.log('employee', employee);
    const defaultShiftId = employee.attendanceGroup?.defaultShiftId;
    const defaultShift = employee.attendanceGroup?.defaultShift;

    if (!defaultShiftId || !defaultShift) {
      this.logger.error(
        `Nhân viên ${employee.id} không có ca mặc định (defaultShiftId).`,
      );
      throw new Error(`No default shift defined for employee group`);
    }

    context.isConfiguredOffDay = false;

    return new ShiftContext(defaultShift);
  }
}
