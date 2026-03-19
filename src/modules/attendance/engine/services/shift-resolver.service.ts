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
  ) {}

  async resolveShift(context: CalculationContext): Promise<ShiftContext> {
    const { employee } = context;
    const defaultShiftId = employee.attendanceGroup?.defaultShiftId;

    if (!defaultShiftId) {
      this.logger.error(
        `Nhân viên ${employee.id} không có ca mặc định (defaultShiftId).`,
      );
      throw new Error(`No default shift defined for employee group`);
    }

    const shift = await this.shiftRepo.findOne({
      where: { id: defaultShiftId },
      relations: ['restRules'],
    });

    if (!shift) {
      throw new Error(`Shift not found: ${defaultShiftId}`);
    }

    context.isConfiguredOffDay = false;

    return new ShiftContext(shift);
  }
}
