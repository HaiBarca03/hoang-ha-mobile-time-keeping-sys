import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveType } from './entities/leave-type.entity';
import { AttendanceGroup } from './entities/attendance-group.entity';
import { Company } from './entities/company.entity';
import { Employee } from './entities/employee.entity';
import { ShiftRestRule } from './entities/shift-rest-rule.entity';
import { Shift } from './entities/shift.entity';
import { EmployeeType } from './entities/employee-type.entity';
import { MasterDataService } from './master-data.service';
import { EmployeeStatus } from './entities/employee-status.entity';
import { JobLevel } from './entities/job-level.entity';
import { WorkLocation } from './entities/work-locations.entity';
import { Department } from './entities/department.entity';
import { MasterDataController } from './master-data.controller';
import { AttendanceMethod } from './entities/attendance-method.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceGroup,
      AttendanceMethod,
      Company,
      EmployeeStatus,
      EmployeeType,
      Employee,
      JobLevel,
      LeaveType,
      ShiftRestRule,
      Shift,
      WorkLocation,
      Department,
    ]),
  ],
  controllers: [MasterDataController],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule { }
