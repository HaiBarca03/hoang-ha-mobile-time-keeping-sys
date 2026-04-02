export enum AttendanceStatus {
  FULL = 'Full',
  PARTIAL = 'Partial',
  LACK = 'Lack',
}

export enum PunchResult {
  LATE = 'Late',
  EARLY = 'Early',
  IN_TIME = 'InTime',
  OUT_TIME = 'OutTime',
  LACK = 'Lack',
  NORMAL = 'Normal',
}

export enum AttendanceGroupCode {
  STORE_GROUP = 'STORE_GROUP',
}

export const CALCULATION_VERSION = 'v1.0.0';

export const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
export const MAX_CACHE_SIZE = 1000;
