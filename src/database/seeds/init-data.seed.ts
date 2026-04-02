import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker/locale/vi';
import { random, randomDateBetween, randomFromArray } from './seed-utils';

import { Company } from '../../modules/master-data/entities/company.entity';
import { Employee } from '../../modules/master-data/entities/employee.entity';
import { Shift } from '../../modules/master-data/entities/shift.entity';
import { ShiftRestRule } from '../../modules/master-data/entities/shift-rest-rule.entity';
import { AttendanceGroup } from '../../modules/master-data/entities/attendance-group.entity';
import { JobLevel } from '../../modules/master-data/entities/job-level.entity';
import { EmployeeType } from '../../modules/master-data/entities/employee-type.entity';
import { EmployeeStatus } from '../../modules/master-data/entities/employee-status.entity';
import { LeaveType } from '../../modules/master-data/entities/leave-type.entity';
import { AttendanceMethod } from '../../modules/master-data/entities/attendance-method.entity';
import { WorkLocation } from '../../modules/master-data/entities/work-locations.entity';
import { Department } from '../../modules/master-data/entities/department.entity';

import { Holiday } from 'src/modules/attendance/entities/holidays.entity';

export const initDataSeed = async (dataSource: DataSource) => {
  console.log('🧹 Bắt đầu seed dữ liệu mẫu đầy đủ các trường hợp...');

  const isMssql = dataSource.options.type === 'mssql';

  if (isMssql) {
    await dataSource.query('EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT ALL"');

    for (const entity of dataSource.entityMetadatas) {
      await dataSource.query(`DELETE FROM "${entity.tableName}"`);

      try {
        await dataSource.query(`DBCC CHECKIDENT ("${entity.tableName}", RESEED, -1)`);
      } catch (e) {
      }
    }
    await dataSource.query('EXEC sp_MSforeachtable "ALTER TABLE ? CHECK CONSTRAINT ALL"');
  } else {
    const tables = dataSource.entityMetadatas
      .map((e) => `"${e.tableName}"`)
      .join(', ');
    await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
  }

  const companyRepo = dataSource.getRepository(Company);

  // 1. Công ty Staaar
  const company2 = await companyRepo.save({
    originId: 'LMONNKZO7X1',
    companyName: 'Hoàng Hà Mobile2',
    taxCode: '0109876543',
    address: 'Địa chỉ của Hoàng Hà Mobile2',
    status: 'ACTIVE',
  });

  const company1 = await companyRepo.save({
    originId: 'LMONNKZO7X5',
    companyName: 'Hoàng Hà Mobile',
    taxCode: '0109876543',
    address: 'Địa chỉ của Hoàng Hà Mobile',
    status: 'ACTIVE',
  });
  const companyId = company1.id;


  const jobLevels = await dataSource.getRepository(JobLevel).save([
    { companyId, code: 'STAFF', levelName: 'Nhân viên', status: 'ACTIVE' },
    { companyId, code: 'STAFF_IT', levelName: 'Nhân viên IT', status: 'ACTIVE' },
    {
      companyId,
      code: 'TEAM_LEAD',
      levelName: 'Trưởng nhóm',
      status: 'ACTIVE',
    },
    {
      companyId,
      code: 'MANAGER',
      levelName: 'Quản lý phòng ban',
      status: 'ACTIVE',
    },
    {
      companyId,
      code: 'SENIOR_MGR',
      levelName: 'Quản lý cấp cao',
      status: 'ACTIVE',
    },
    {
      companyId,
      code: 'DIRECTOR',
      levelName: 'Giám đốc khối',
      status: 'ACTIVE',
    },
  ]); // EmployeeType – các loại hình lao động

  const empTypes = await dataSource.getRepository(EmployeeType).save([
    { companyId, code: 'OFFICIAL', typeName: 'Chính thức' },
    { companyId, code: 'PROBATION', typeName: 'Thử việc' },
    { companyId, code: 'SEASONAL', typeName: 'Thời vụ' },
    { companyId, code: 'COLLABORATOR', typeName: 'Cộng tác viên' },
    { companyId, code: 'PART_TIME', typeName: 'Bán thời gian' },
    { companyId, code: 'SHIFT_WORKER', typeName: 'Ca kíp' },
  ]); // EmployeeStatus – các trạng thái phổ biến

  const empStatuses = await dataSource.getRepository(EmployeeStatus).save([
    { companyId, code: 'WORKING', statusName: 'Đang làm việc' },
    { companyId, code: 'PROBATION_END', statusName: 'Hết thử việc' },
    { companyId, code: 'RESIGNED', statusName: 'Đã nghỉ việc' },
    { companyId, code: 'TERMINATED', statusName: 'Sa thải' },
    { companyId, code: 'MATERNITY_LEAVE', statusName: 'Nghỉ thai sản' },
    { companyId, code: 'SUSPENDED', statusName: 'Tạm đình chỉ' },
  ]); // AttendanceMethod – các phương thức chấm công

  const attMethods = await dataSource.getRepository(AttendanceMethod).save([
    { companyId, code: 'NONE', methodName: 'Không chấm công' },
    { companyId, code: 'LARK_APP', methodName: 'Lark Attendance' },
    { companyId, code: 'LARK_WEBHOOK', methodName: 'Lark Webhook' },
    { companyId, code: 'FACE_ID', methodName: 'Face ID' },
    { companyId, code: 'TIME_MACHINE', methodName: 'Máy chấm công' },
    { companyId, code: 'EXCEL_IMPORT', methodName: 'Import Excel' },
  ]); // LeaveType – các loại nghỉ phép phổ biến ở VN

  const leaveTypes = await dataSource.getRepository(LeaveType).save([
    {
      companyId,
      code: 'ANNUAL_LEAVE',
      leaveTypeName: 'Nghỉ phép năm',
      isDeductLeave: true,
    },
    {
      companyId,
      code: 'UNPAID_LEAVE',
      leaveTypeName: 'Nghỉ không lương',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'SICK_LEAVE',
      leaveTypeName: 'Nghỉ ốm',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'MARRIAGE_SELF',
      leaveTypeName: 'Kết hôn bản thân',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'MARRIAGE_CHILD',
      leaveTypeName: 'Con kết hôn',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'FUNERAL_LEAVE',
      leaveTypeName: 'Nghỉ hiếu',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'PATERNITY_LEAVE',
      leaveTypeName: 'Nghỉ sinh con (bố)',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'MATERNITY_LEAVE',
      leaveTypeName: 'Nghỉ thai sản',
      isDeductLeave: false,
    },
  ]);

  const locationsData = [
    {
      "originId": "LMONNKZO7X5",
      "locationName": "Kho khoang mái",
      "address": "104 Đ. Trần Duy Hưng, Trung Hoà, Cầu Giấy, Hà Nội",
      "companyId": "1",
      "isHead": true
    },
    {
      "originId": "1261010615",
      "locationName": "Xưởng Đà Lạt - 114 Phùng Hưng",
      "address": null,
      "companyId": "1"
    },
    {
      "originId": "1221014002",
      "locationName": "Nhóm Data và Planning",
      "address": null,
      "companyId": "1"
    },
    {
      "originId": "1221014003",
      "locationName": "F Bà Triệu",
      "address": null,
      "companyId": "1"
    },
    {
      "originId": "1221014001",
      "locationName": "F Trần Duy Hưng",
      "address": null,
      "companyId": "1"
    },
    {
      "originId": "1231013073",
      "locationName": "T Ngô Xuân Quảng",
      "address": "Gia Lâm, Hà Nội",
      "companyId": "1"
    },
    {
      "originId": "1231013098",
      "locationName": "T Ngọc Hồi",
      "address": "Thanh Trì, Hà Nội",
      "companyId": "1"
    },
    {
      "originId": "1231013003",
      "locationName": "T Ngọc Lâm",
      "address": "Long Biên, Hà Nội",
      "companyId": "1"
    },
    {
      "originId": "1231013019",
      "locationName": "T Nguyễn Hoàng",
      "address": "Nam Từ Liêm, Hà Nội",
      "companyId": "1"
    },
    {
      "originId": "1231013063",
      "locationName": "T Nguyễn Văn Lộc",
      "address": "Hà Đông, Hà Nội",
      "companyId": "1"
    },
    {
      "originId": "1231013045",
      "locationName": "T Trần Duy Hưng",
      "address": "Quận 1, TP.HCM",
      "companyId": "1"
    },
    {
      "originId": "1491010000",
      "locationName": "Phòng Kho vận",
      "address": null,
      "companyId": "1"
    },
    {
      "originId": "1441000000",
      "locationName": "Phòng Công nghệ thông tin",
      "address": null,
      "companyId": "1"
    }
  ]

  const workLocationRepo = dataSource.getRepository(WorkLocation);

  // Chuyển đổi dữ liệu thô sang định dạng Entity
  const locationsToSave = locationsData.map((loc) => ({
    companyId: companyId,
    originId: loc.originId,
    locationName: loc.locationName,
    address: loc.address || 'Đang cập nhật',
    isHeadOffice: loc.isHead || false,
    status: 'ACTIVE',
  }));

  const savedLocations = await workLocationRepo.save(locationsToSave);

  console.log(`Đã lưu thành công ${savedLocations.length} địa điểm làm việc.`);

  // const khoiTech = await dataSource.getRepository(Department).save({
  //   companyId,
  //   departmentName: 'Khối Công nghệ',
  //   departmentCode: 'K_TECH',
  // });
  // const khoiSales = await dataSource.getRepository(Department).save({
  //   companyId,
  //   departmentName: 'Khối Kinh doanh',
  //   departmentCode: 'K_SALES',
  // });
  // const khoiOps = await dataSource.getRepository(Department).save({
  //   companyId,
  //   departmentName: 'Khối Vận hành',
  //   departmentCode: 'K_OPS',
  // });

  // await dataSource.getRepository(Department).save([
  //   {
  //     companyId,
  //     departmentName: 'Phòng Backend',
  //     parentId: khoiTech.id,
  //     departmentCode: 'P_BACKEND',
  //   },
  //   {
  //     companyId,
  //     departmentName: 'Phòng Frontend',
  //     parentId: khoiTech.id,
  //     departmentCode: 'P_FRONTEND',
  //   },
  //   {
  //     companyId,
  //     departmentName: 'Phòng Mobile',
  //     parentId: khoiTech.id,
  //     departmentCode: 'P_MOBILE',
  //   },
  //   {
  //     companyId,
  //     departmentName: 'Phòng Sales Miền Bắc',
  //     parentId: khoiSales.id,
  //     departmentCode: 'P_SALES_HN',
  //   },
  //   {
  //     companyId,
  //     departmentName: 'Phòng Sales Miền Nam',
  //     parentId: khoiSales.id,
  //     departmentCode: 'P_SALES_HCM',
  //   },
  //   {
  //     companyId,
  //     departmentName: 'Bộ phận Cửa hàng',
  //     parentId: khoiOps.id,
  //     departmentCode: 'P_STORE',
  //   },
  //   {
  //     companyId,
  //     departmentName: 'Bộ phận Xưởng',
  //     parentId: khoiOps.id,
  //     departmentCode: 'P_FACTORY',
  //   },
  // ]);

  // Giả sử companyId đã được định nghĩa trước đó
  const departmentRepo = dataSource.getRepository(Department);

  const departmentsToSave = [
    { originId: '1261010615', departmentName: 'Nhóm Data và Planning', companyId, departmentCode: '1261010615' },
    { originId: 'fd592799e6d8612a', departmentName: 'Phòng Kinh doanh Format', companyId, departmentCode: 'FORMAT' },
    { originId: '1261010623', departmentName: 'Phòng Kinh doanh Market Place', companyId, departmentCode: '1261010623' },
    { originId: '1261010624', departmentName: 'Phòng kinh doanh O2O', companyId, departmentCode: '1261010624' },
    { originId: 'defbge38af6f1d6b', departmentName: 'Phòng Kinh Doanh TKL', companyId, departmentCode: 'TKL' },
    { originId: '1351010210', departmentName: 'Phòng Marketing F', companyId, departmentCode: 'MKT_F' },
    { originId: '1351020310', departmentName: 'Phòng Marketing T', companyId, departmentCode: 'MKT_T' },
    { originId: '1481020000', departmentName: 'Phòng Merchandise', companyId, departmentCode: '1481020000' },
    { originId: '1351030410', departmentName: 'Phòng Sáng tạo và Phát triển nội dung', companyId, departmentCode: 'CONTENT' },
    { originId: '1481090000', departmentName: 'Phòng Visual Merchandise', companyId, departmentCode: 'VM' },
    { originId: '1481010000', departmentName: 'Phòng Cung ứng và Quản lý sản xuất', companyId, departmentCode: '1481010000' },
    { originId: '1491010000', departmentName: 'Phòng Kho vận', companyId, departmentCode: 'LOGISTICS' },
    { originId: '1111000000', departmentName: 'Phòng Nghiên cứu và Phát triển sản phẩm', companyId, departmentCode: 'RND' },
    { originId: '1111020000', departmentName: 'Phòng Phát triển Mẫu', companyId, departmentCode: 'SAMPLE' },
    { originId: '1511020000', departmentName: 'Ban Giám đốc', companyId, departmentCode: 'BOD' },
    { originId: '1211010000', departmentName: 'Nhóm Trợ lý Chủ tịch & Tổng giám đốc', companyId, departmentCode: 'PA' },
    { originId: '1351030000', departmentName: 'Phòng Chăm sóc khách hàng', companyId, departmentCode: 'CS' },
    { originId: '1441000000', departmentName: 'Phòng Công nghệ thông tin', companyId, departmentCode: 'IT' },
    { originId: '1471020000', departmentName: 'Phòng Dự Án Xây Dựng', companyId, departmentCode: 'CONSTRUCTION' },
    { originId: '1451080000', departmentName: 'Phòng Nhân sự', companyId, departmentCode: 'HR' },
    { originId: '1471010000', departmentName: 'Phòng phát triển mặt bằng', companyId, departmentCode: 'REAL_ESTATE' },
    { originId: '1451070000', departmentName: 'Phòng Quản trị nội bộ', companyId, departmentCode: 'ADMIN' },
    { originId: '1461000000', departmentName: 'Phòng Tài chính Kế toán', companyId, departmentCode: 'ACC' },
  ];

  await departmentRepo.save(departmentsToSave);

  const shiftsData = [
    {
      originId: '7617681822219587098',
      code: 'CA_HAN_CHINH_1',
      shiftName: 'Ca hanh chinh 1',
      startTime: '08:00',
      endTime: '17:00',
      shiftHours: 8,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 1,
      companyId,
    },
    {
      originId: '17617686815940365847',
      code: 'CA_HAN_CHINH_2',
      shiftName: 'Ca hanh chinh 2',
      startTime: '08:30',
      endTime: '17:30',
      shiftHours: 8,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 1,
      companyId,
    },
    {
      originId: '17617682250839723546',
      code: 'CA_THAI_SAN_1',
      shiftName: 'Ca thai san 1',
      startTime: '09:00',
      endTime: '17:00',
      shiftHours: 7,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 1,
      companyId,
    },
    {
      originId: '17617682373005577752',
      code: 'CA_THAI_SAN_2',
      shiftName: 'Ca thai san 2',
      startTime: '08:00',
      endTime: '17:00',
      shiftHours: 7,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 2,
      companyId,
    },
    {
      originId: '17617682487157722647',
      code: 'CA_THAI_SAN_3',
      shiftName: 'Ca thai san 3',
      startTime: '08:00',
      endTime: '17:00',
      shiftHours: 7,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 3,
      companyId,
    },
    {
      originId: '17617682625448168986',
      code: 'CA_THAI_SAN_4',
      shiftName: 'Ca thai san 4',
      startTime: '08:00',
      endTime: '16:00',
      shiftHours: 7,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 1,
      companyId,
    },
    {
      originId: '17617682773432405527',
      code: 'CA_THAI_SAN_5',
      shiftName: 'Ca thai san 5',
      startTime: '08:30',
      endTime: '17:00',
      shiftHours: 7,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 4,
      companyId,
    },
    {
      originId: '17617683974790942231',
      code: 'CA_THAI_SAN_6',
      shiftName: 'Ca thai san 6',
      startTime: '08:30',
      endTime: '17:00',
      shiftHours: 7,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 5,
      companyId,
    },
    {
      originId: '17617684273964781080',
      code: 'CA_THAI_SAN_7',
      shiftName: 'Ca thai san 7',
      startTime: '08:30',
      endTime: '16:30',
      shiftHours: 7,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 1,
      companyId,
    },
    {
      originId: '17617684657173171736',
      code: 'CA_THAI_SAN_8',
      shiftName: 'Ca thai san 8',
      startTime: '08:00',
      endTime: '17:00',
      shiftHours: 7,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 6,
      companyId,
    },
    {
      originId: '17617684839291555351',
      code: 'CA_THAI_SAN_9',
      shiftName: 'Ca thai san 9',
      startTime: '08:00',
      endTime: '16:30',
      shiftHours: 7,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 4,
      companyId,
    },
    {
      originId: '17617684959968415256',
      code: 'CA_THAI_SAN_10',
      shiftName: 'Ca thai san 10',
      startTime: '08:00',
      endTime: '16:30',
      shiftHours: 7,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: 5,
      companyId,
    },
    {
      originId: 'Cacuahang1',
      code: 'CA_CUA_HANG_1',
      shiftName: 'Ca cua hang 1',
      startTime: '08:00',
      endTime: '09:00',
      shiftHours: 1,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: null,
      companyId,
    },
    {
      originId: 'Cacuahang2',
      code: 'CA_CUA_HANG_2',
      shiftName: 'Ca cua hang 2',
      startTime: '09:00',
      endTime: '12:00',
      shiftHours: 3,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: null,
      companyId,
    },
    {
      originId: 'Cacuahang3',
      code: 'CA_CUA_HANG_3',
      shiftName: 'Ca cua hang 3',
      startTime: '12:00',
      endTime: '15:00',
      shiftHours: 3,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: null,
      companyId,
    },
    {
      originId: 'Cacuahang4',
      code: 'CA_CUA_HANG_4',
      shiftName: 'Ca cua hang 4',
      startTime: '15:00',
      endTime: '18:00',
      shiftHours: 3,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: null,
      companyId,
    },
    {
      originId: 'Cacuahang5',
      code: 'CA_CUA_HANG_5',
      shiftName: 'Ca cua hang 5',
      startTime: '18:00',
      endTime: '21:00',
      shiftHours: 3,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: null,
      companyId,
    },
    {
      originId: 'Cacuahang6',
      code: 'CA_CUA_HANG_6',
      shiftName: 'Ca cua hang 6',
      startTime: '21:00',
      endTime: '22:00',
      shiftHours: 1,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
      restId: null,
      companyId,
    }
  ];

  const restRulesMapping = {
    1: { start: '12:00', end: '13:00' },
    2: { start: '11:00', end: '13:00' },
    3: { start: '12:00', end: '14:00' },
    4: { start: '11:30', end: '13:00' },
    5: { start: '12:00', end: '13:30' },
    6: { start: '11:30', end: '13:30' },
  };

  const groupsData = [
    {
      originId: '7617676707973074458',
      code: 'GR_VAN_PHONG_1',
      groupName: 'Ca Văn Phòng 1',
      shiftCode: 'CA_HAN_CHINH_1', // Map từ 7617681822219587098
      companyId,
    },
    {
      originId: '7617681982959554072',
      code: 'GR_VAN_PHONG_2',
      groupName: 'Ca Văn Phòng 2',
      shiftCode: 'CA_HAN_CHINH_2', // Map từ 17617686815940365847
      companyId,
    },
    {
      originId: '7617687309982371354',
      code: 'GR_THAI_SAN_1',
      groupName: 'Ca thai sản 1',
      shiftCode: 'CA_THAI_SAN_1', // Map từ 17617682250839723546
      companyId,
    },
    {
      originId: '7617689477007330840',
      code: 'GR_THAI_SAN_2',
      groupName: 'Ca thai sản 2',
      shiftCode: 'CA_THAI_SAN_2', // Map từ 17617682373005577752
      companyId,
    },
    {
      originId: '7617689963334307352',
      code: 'GR_THAI_SAN_3',
      groupName: 'Ca thai sản 3',
      shiftCode: 'CA_THAI_SAN_3', // Map từ 17617682487157722647
      companyId,
    },
    {
      originId: '7617690605853871642',
      code: 'GR_THAI_SAN_4',
      groupName: 'Ca thai sản 4',
      shiftCode: 'CA_THAI_SAN_4', // Map từ 17617682625448168986
      companyId,
    },
    {
      originId: '7617691029176651290',
      code: 'GR_THAI_SAN_5',
      groupName: 'Ca thai sản 5',
      shiftCode: 'CA_THAI_SAN_5', // Map từ 17617682773432405527
      companyId,
    },
    {
      originId: '7617691935276322327',
      code: 'GR_THAI_SAN_6',
      groupName: 'Ca thai sản 6',
      shiftCode: 'CA_THAI_SAN_6', // Map từ 17617683974790942231
      companyId,
    },
    {
      originId: '7617692580343500311',
      code: 'GR_THAI_SAN_7',
      groupName: 'Ca thai sản 7',
      shiftCode: 'CA_THAI_SAN_7', // Map từ 17617684273964781080
      companyId,
    },
    {
      originId: '7617694472352042522',
      code: 'GR_THAI_SAN_8',
      groupName: 'Ca thai sản 8',
      shiftCode: 'CA_THAI_SAN_8', // Map từ 17617684657173171736
      companyId,
    },
    {
      originId: '7617694808810753559',
      code: 'GR_THAI_SAN_9',
      groupName: 'Ca thai sản 9',
      shiftCode: 'CA_THAI_SAN_9', // Map từ 17617684839291555351
      companyId,
    },
    {
      originId: '7617695144120159768',
      code: 'GR_THAI_SAN_10',
      groupName: 'Ca thai sản 10',
      shiftCode: 'CA_THAI_SAN_10', // Map từ 17617684959968415256
      companyId,
    },
    {
      originId: '7617745162118123031',
      code: 'GR_CUA_HANG',
      groupName: 'Ca cửa hàng',
      shiftCode: 'CA_CUA_HANG_1', // Map từ Cacuahang1
      allShiftCodes: ['CA_HANH_CHINH_1', 'CA_HANH_CHINH_2'], // Map từ list số cũ
      companyId,
    },
  ];

  const shiftRepo = dataSource.getRepository(Shift);
  const restRepo = dataSource.getRepository(ShiftRestRule);
  const attendanceGroupRepo = dataSource.getRepository(AttendanceGroup);

  // Khai báo mảng chứa kết quả ở ngoài để các vòng lặp sau có thể sử dụng
  const savedShifts: Shift[] = [];
  const restIdToDbEntityMap = new Map<number, ShiftRestRule>();

  // --- PHẦN 1: LƯU REST RULES ---
  for (const [key, rule] of Object.entries(restRulesMapping)) {
    const savedRule = await restRepo.save({
      restBeginTime: `${rule.start}:00`,
      restEndTime: `${rule.end}:00`,
    });
    restIdToDbEntityMap.set(Number(key), savedRule);
    console.log(`--- Đã lưu Rest Rule: ${rule.start} - ${rule.end} ---`);
  }

  // --- PHẦN 2: LƯU SHIFTS ---
  for (const s of shiftsData) {
    const assignedRestRule = s.restId
      ? restIdToDbEntityMap.get(s.restId)
      : undefined;

    // Dùng .create() để TypeScript không báo lỗi Overload
    const newShift = shiftRepo.create({
      companyId: companyId,
      code: s.code,
      originId: s.code,
      shiftName: s.shiftName,
      startTime: new Date(`2026-01-01T${s.startTime}:00+07:00`),
      endTime: new Date(`2026-01-01T${s.endTime}:00+07:00`),
      shiftHours: s.shiftHours,
      allowLateMinutes: s.allowLateMinutes,
      allowEarlyMinutes: s.allowEarlyMinutes,
      restRule: assignedRestRule ?? undefined, // Chuyển null thành undefined
    });

    const saved = await shiftRepo.save(newShift);
    savedShifts.push(saved); // Lưu vào mảng để tí nữa dùng cho Group
    console.log(`--- Đã lưu Shift: ${s.shiftName} ---`);
  }

  // --- PHẦN 3: LƯU GROUPS ---
  const savedGroups: AttendanceGroup[] = [];

  for (const g of groupsData) {
    // Bây giờ 'savedShifts' đã có dữ liệu để tìm kiếm
    const defaultShift = savedShifts.find((s) => s.code === g.shiftCode);
    let relatedShifts: Shift[] = [];

    if (g.shiftCode === 'Cacuahang1') {
      relatedShifts = savedShifts.filter((s) => s.code.startsWith('Cacuahang'));
    } else {
      // Các nhóm khác chỉ lấy chính ca mặc định của nó
      relatedShifts = defaultShift ? [defaultShift] : [];
    }
    const groupEntity = attendanceGroupRepo.create({
      companyId: companyId,
      originId: g.code,
      code: g.code,
      groupName: g.groupName,
      // Gán ID nếu tìm thấy, không thì undefined
      defaultShiftId: defaultShift?.id ?? undefined,
      shifts: relatedShifts,
      status: 'ACTIVE',
    });

    const group = await attendanceGroupRepo.save(groupEntity);
    savedGroups.push(group);
  }

  console.log(`--- Đã import xong ${savedGroups.length} nhóm chấm công ---`);

  const holidayRepo = dataSource.getRepository(Holiday);

  const parseVNCardDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const holidaysData = [
    { name: 'Tết Dương lịch', date: '01/01/2026', type: 'PUBLIC', value: 1.0 },
    { name: 'Tết Nguyên đán', date: '17/02/2026', type: 'PUBLIC', value: 1.0 },
    { name: 'NKT VN', date: '18/04/2026', type: 'ANGEL', value: 1.0 }, // Map "Nghỉ lễ Angel" -> ANGEL
    { name: 'Du lịch', date: '20/03/2026', type: 'SPECIAL', value: 1.0 }, // Map "Nghỉ đặc biệt" -> SPECIAL
  ];

  for (const h of holidaysData) {
    await holidayRepo.save({
      companyId: companyId,
      holiday_name: h.name,
      holiday_date: parseVNCardDate(h.date),
      holiday_type: h.type as any,
      workday_value: h.value,
      is_active: true,
    });
  }

  console.log(
    `--- Đã import thành công ${holidaysData.length} ngày lễ cho công ty ---`,
  );
  // ──────────────────────────────────────────────
  // 7. EMPLOYEE – đa dạng mọi trường hợp
  // ──────────────────────────────────────────────

  const employeeRepo = dataSource.getRepository(Employee);

  // Lấy các dữ liệu tham chiếu
  const empGroup = savedGroups.find((g) => g.code === 'GR_VAN_PHONG_1');

  // workLocations không có field isHeadOffice, ta tìm theo tên
  const workLocationOffice = savedLocations.find((l) => l.locationName && !l.locationName.includes('Cửa hàng')) || savedLocations[0];
  const workLocationStore = savedLocations.find((l) => l.locationName && l.locationName.includes('Cửa hàng')) || savedLocations[0];

  const departments = await dataSource.getRepository(Department).find({ where: { companyId } });
  const deptOffice = departments.find(d => d.departmentCode === 'P_BACKEND') || departments[0];
  const deptStore = departments.find(d => d.departmentCode === 'P_STORE') || departments[0];

  const testCases = [
    {
      id: '1001',
      userName: 'vp_chuan',
      fullName: 'NV VP Đi Chuẩn',
      groupCode: 'GR_VAN_PHONG_1', // Ca VP 1
      isMaternity: false,
      isStore: false,
    },
    {
      id: '1002',
      userName: 'vp_dimuon',
      fullName: 'NV VP Đi Muộn',
      groupCode: 'GR_VAN_PHONG_1',
      isMaternity: false,
      isStore: false,
    },
    {
      id: '1003',
      userName: 'vp_vesom',
      fullName: 'NV VP Về Sớm',
      groupCode: 'GR_VAN_PHONG_1',
      isMaternity: false,
      isStore: false,
    },
    {
      id: '1004',
      userName: 'vp_quen_cham',
      fullName: 'NV VP Quên Chấm Công',
      groupCode: 'GR_VAN_PHONG_1',
      isMaternity: false,
      isStore: false,
    },
    {
      id: '1005',
      userName: 'ts_muon_1h',
      fullName: 'NV Thai Sản Đi Muộn 1h',
      groupCode: 'GR_THAI_SAN_1', // Ca thai sản 1
      isMaternity: true,
      isStore: false,
    },
    {
      id: '1006',
      userName: 'ts_ve_som_1h',
      fullName: 'NV Thai Sản Về Sớm 1h',
      groupCode: 'GR_THAI_SAN_2', // Ca thai sản 2
      isMaternity: true,
      isStore: false,
    },
    {
      id: '1007',
      userName: 'ch_ca_sang',
      fullName: 'NV Cửa Hàng Ca Sáng',
      groupCode: 'GR_CUA_HANG', // Ca cửa hàng
      isMaternity: false,
      isStore: true,
    },
    {
      id: '1008',
      userName: 'ch_ca_chieu',
      fullName: 'NV Cửa Hàng Ca Chiều',
      groupCode: 'GR_CUA_HANG', // Ca cửa hàng
      isMaternity: false,
      isStore: true,
    },
    {
      id: '1009',
      userName: 'ch_xoay_ca',
      fullName: 'NV Cửa Hàng Xoay Ca',
      groupCode: 'GR_CUA_HANG', // Ca cửa hàng
      isMaternity: false,
      isStore: true,
    },
    {
      id: '1010',
      userName: 'vp_parttime',
      fullName: 'NV VP Part-time',
      groupCode: 'GR_VAN_PHONG_1', // Ca VP 1
      isPartTime: true,
      isMaternity: false,
      isStore: false,
    },
    {
      id: '1011',
      userName: 'vp_t7_off',
      fullName: 'NV VP Nghỉ Thứ 7',
      groupCode: 'GR_VAN_PHONG_1', // Ca VP 1
      isSaturdayOff: true,
      isMaternity: false,
      isStore: false,
    },
  ];

  // const employees: Employee[] = [];

  // for (const tc of testCases) {
  //   const isFemale = tc.isMaternity ? true : faker.datatype.boolean();
  //   const joinedAt = faker.date.past({ years: 4 });
  //   const selectedGroup = savedGroups.find((g) => g.code === tc.groupCode) || empGroup;

  //   let empType = empTypes.find((t) => t.code === 'OFFICIAL')!;
  //   if (tc.isPartTime) empType = empTypes.find((t) => t.code === 'PART_TIME')!;
  //   if (tc.isStore) empType = empTypes.find((t) => t.code === 'SHIFT_WORKER')!;

  //   employees.push(employeeRepo.create({
  //     companyId,
  //     userId: tc.id,
  //     originId: `604465_${tc.id}`,
  //     userName: tc.userName,
  //     fullName: tc.fullName,
  //     email: `${tc.userName}@upbase.global`,
  //     phoneNumber: faker.phone.number(),
  //     gender: isFemale ? 'FEMALE' : 'MALE',
  //     birthday: faker.date.birthdate({ min: 22, max: 48, mode: 'age' }),
  //     joinedAt,
  //     resignedAt: null,
  //     workLocation: tc.isStore ? workLocationStore : workLocationOffice,
  //     departments: [tc.isStore ? deptStore : deptOffice],
  //     attendanceGroup: selectedGroup,
  //     jobLevel: randomFromArray(jobLevels),
  //     employeeType: empType,
  //     employeeStatus: empStatuses.find((s) => s.code === 'WORKING') || empStatuses[0],
  //     attendanceMethod: attMethods.find(m => m.code === 'TIME_MACHINE') || attMethods[0],
  //     is_saturday_off: !!tc.isSaturdayOff,
  //     is_angel: false,
  //     is_maternity_shift: !!tc.isMaternity,
  //     leavePolicy: leavePolicy,
  //     larkId: `lark_${tc.id}`,
  //   }));
  // }

  // const savedEmployees = await employeeRepo.save(employees);
  // console.log(`--- Đã seed thành công ${savedEmployees.length} nhân viên test cases ---`);

  console.log('✅ Hoàn thành seed dữ liệu – đầy đủ các trường hợp nghiệp vụ');
};