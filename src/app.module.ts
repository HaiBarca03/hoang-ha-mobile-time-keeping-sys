import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ApprovalManagementModule } from './modules/approval-management/approval-management.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    MasterDataModule,
    AttendanceModule,
    ApprovalManagementModule,
  ],
  providers: [
    // Logger,
  ],
})
export class AppModule { }
