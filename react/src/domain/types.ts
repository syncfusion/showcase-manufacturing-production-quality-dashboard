export type LineId = 'L1' | 'L2' | 'L3';
export type ShiftId = 'morning' | 'afternoon' | 'night';
export type Severity = 'info' | 'watch' | 'action';
export type JobState = 'queued' | 'running' | 'held' | 'done';

export interface Line {
  id: LineId;
  name: string;
  cell: string;
  targetPerHour: number;
  goodThisHour: number;
  targetThisHour: number;
  state: 'running' | 'held' | 'changeover';
  heldReason?: string;
}

export interface Shift {
  id: string;
  date: string;
  shift: ShiftId;
  /** Title-case label shown on the schedule. The id stays lowercase for logic. */
  shiftName: 'Morning' | 'Afternoon' | 'Night';
  lineId: LineId;
  lead: string;
  crew: number;
  plannedUnits: number;
  goodUnits: number;
  scrapUnits: number;
  downtimeMin: number;
  note?: string;
}

export interface Order {
  id: string;
  customer: string;
  sku: string;
  skuName: string;
  due: string;
  qty: number;
  done: number;
  lineId: LineId;
  priority: 'firm' | 'plan';
  state: 'open' | 'at-risk' | 'late' | 'complete';
}

export interface Defect {
  id: string;
  date: string;
  lineId: LineId;
  sku: string;
  type: string;
  station: string;
  count: number;
  disposition: 'rework' | 'scrap' | 'use-as-is';
}

export interface Job {
  id: string;
  orderId: string;
  sku: string;
  lineId: LineId;
  station: string;
  qty: number;
  done: number;
  state: JobState;
  heldReason?: string;
  startedAt?: string;
}

export interface Alert {
  id: string;
  at: string;
  severity: Severity;
  lineId?: LineId;
  text: string;
  open: boolean;
}

export interface PlantFixture {
  asOf: string;
  weekStart: string;
  lines: Line[];
  shifts: Shift[];
  orders: Order[];
  defects: Defect[];
  jobs: Job[];
  alerts: Alert[];
}
