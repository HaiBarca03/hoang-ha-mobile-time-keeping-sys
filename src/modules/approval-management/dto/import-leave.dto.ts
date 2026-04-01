import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ImportLeaveDto {
  @ApiProperty({
    example: [
      {
        recordId: 'rec_unique_123',
        Type: 'LEAVE',
        RequesterID: 'EMP001',
        RequestNo: 'REQ-2024-001',
        Status: 'Approved',
        StartTime: '2024-03-20T08:00:00Z',
        EndTime: '2024-03-20T17:30:00Z',
        Duration: 8.0,
        DetailType: 'Nghỉ phép năm',
        Note: 'Lý do xin nghỉ...',
        AdjustmentTime: '2024-03-20T08:00:00Z'
      }
    ],
  })
  @IsNotEmpty()
  result: any;
}
