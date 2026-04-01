import { BaseEntity } from "../../../database/entities/base.entity";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { AttendanceRequest } from "./attendance-request.entity";

@Entity('request_detail_adjustment')
export class RequestDetailAdjustment extends BaseEntity {

  @Column()
  attendance_request_id: string;

  // --- Correction ---
  @Column({ type: 'datetime2', nullable: true })
  original_record: Date;

  @Column({ type: 'datetime2', nullable: true })
  replenishment_time: Date;

  @OneToOne(() => AttendanceRequest, (req) => req.detail_adjustment)
  @JoinColumn({ name: 'attendance_request_id' })
  request: AttendanceRequest;
}