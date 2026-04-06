import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Query,
  Get,
} from '@nestjs/common';
import { ApprovalManagementService } from './approval-management.service';
import { ApiOperation } from '@nestjs/swagger';
import { ImportLeaveDto } from './dto/import-leave.dto';

@Controller('approval-management')
export class ApprovalManagementController {
  constructor(private readonly leaveService: ApprovalManagementService) {}

  @Post('')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import JSON thô từ Base' })
  async importData(
    @Query('companyId') companyId: string,
    @Body() body: ImportLeaveDto,
  ) {
    return await this.leaveService.importFromExternalSource(body, companyId);
  }
  @Get('list')
  @ApiOperation({ summary: 'Lấy danh sách request để check múi giờ' })
  async getList(@Query('companyId') companyId: string) {
    // Giả sử ông đã viết hàm findAll trong Service
    return await this.leaveService.findAllByCompany(companyId);
  }
}
