import type { Alert, Defect, Job, Line, Order, PlantFixture, Shift } from '../domain/types';

const lines: Line[] = [
  { id: 'L1', name: 'Line 1', cell: 'Final assembly', targetPerHour: 42, goodThisHour: 39, targetThisHour: 42, state: 'running' },
  { id: 'L2', name: 'Line 2', cell: 'Final assembly', targetPerHour: 36, goodThisHour: 11, targetThisHour: 36, state: 'held', heldReason: 'Torque gun out of calibration' },
  { id: 'L3', name: 'Line 3', cell: 'Sub-assembly', targetPerHour: 28, goodThisHour: 26, targetThisHour: 28, state: 'changeover' }
];

const leads = [
  'Amina Okonkwo', 'Mei Chen', 'Ravi Patel', 'Sofia Novak',
  'Luis Ortega', 'Hannah Berg', 'Kenji Sato', 'Nora Ibrahim', 'Elena Vasquez'
];
const shiftNames = { morning: 'Morning', afternoon: 'Afternoon', night: 'Night' } as const;

function shifts(): Shift[] {
  const dates = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'];
  const plan: Shift[] = [];
  for (const date of dates) {
    const dayIndex = dates.indexOf(date);
    for (const shift of ['morning', 'afternoon', 'night'] as const) {
      for (const lineId of ['L1', 'L2', 'L3'] as const) {
        const planned = lineId === 'L3' ? 210 : lineId === 'L2' ? 270 : 320;
        const dow = new Date(date + 'T00:00:00Z').getUTCDay();
        const good = Math.round(planned * (lineId === 'L2' && shift === 'night' ? 0.86 : 0.97 - (dow === 1 ? 0.02 : 0)));
        const shiftIndex = shift === 'morning' ? 0 : shift === 'afternoon' ? 1 : 2;
        const lineIndex = lineId === 'L1' ? 0 : lineId === 'L2' ? 1 : 2;
        plan.push({
          id: `${date}-${shift}-${lineId}`,
          date, shift, shiftName: shiftNames[shift], lineId,
          lead: leads[(dayIndex + shiftIndex * 3 + lineIndex) % leads.length],
          crew: lineId === 'L3' ? 6 : 8,
          plannedUnits: planned,
          goodUnits: good,
          scrapUnits: Math.max(2, planned - good - 4),
          downtimeMin: lineId === 'L2' && date === '2026-10-20' ? 46 : 12
        });
      }
    }
  }
  return plan;
}

const orders: Order[] = [
  { id: 'SO-4418', customer: 'Northwind Transit', sku: 'HX-220', skuName: 'Drive housing', due: '2026-10-21', qty: 400, done: 310, lineId: 'L1', priority: 'firm', state: 'open' },
  { id: 'SO-4422', customer: 'Harbor Lift', sku: 'HX-220', skuName: 'Drive housing', due: '2026-10-22', qty: 240, done: 40, lineId: 'L2', priority: 'firm', state: 'at-risk' },
  { id: 'SO-4430', customer: 'Fieldline AG', sku: 'BR-14', skuName: 'Brake module', due: '2026-10-23', qty: 180, done: 180, lineId: 'L3', priority: 'firm', state: 'complete' },
  { id: 'SO-4436', customer: 'Keel & Co', sku: 'HX-310', skuName: 'Drive housing, heavy', due: '2026-10-24', qty: 160, done: 20, lineId: 'L1', priority: 'plan', state: 'open' },
  { id: 'SO-4441', customer: 'Northwind Transit', sku: 'BR-14', skuName: 'Brake module', due: '2026-10-20', qty: 90, done: 30, lineId: 'L2', priority: 'firm', state: 'late' },
  { id: 'SO-4448', customer: 'Sable Medical', sku: 'HX-220', skuName: 'Drive housing', due: '2026-10-27', qty: 300, done: 0, lineId: 'L1', priority: 'plan', state: 'open' },
  { id: 'SO-4452', customer: 'Harbor Lift', sku: 'HX-310', skuName: 'Drive housing, heavy', due: '2026-10-28', qty: 120, done: 0, lineId: 'L3', priority: 'plan', state: 'open' },
  { id: 'SO-4459', customer: 'Fieldline AG', sku: 'BR-14', skuName: 'Brake module', due: '2026-10-25', qty: 200, done: 60, lineId: 'L3', priority: 'firm', state: 'open' }
];

const defectTypes = [
  ['Torque out of range', 'Station 4', 'rework'],
  ['Seal nick', 'Station 2', 'scrap'],
  ['Label mismatch', 'Pack', 'rework'],
  ['Bore oversize', 'Station 1', 'scrap'],
  ['Cosmetic scratch', 'Station 3', 'use-as-is']
] as const;

function defects(): Defect[] {
  const rows: Defect[] = [];
  let n = 1;
  for (const date of ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']) {
    const dayBump = date === '2026-10-20' ? 4 : date === '2026-10-21' ? 1 : date === '2026-10-22' ? 2 : date === '2026-10-23' ? 1 : 0;
    defectTypes.forEach(([type, station, disposition], index) => {
      rows.push({
        id: `DF-${n++}`, date, lineId: (['L1', 'L2', 'L3'] as const)[index % 3],
        sku: index % 2 === 0 ? 'HX-220' : 'BR-14', type, station, disposition,
        count: (type.startsWith('Torque') ? 14 : 3 + index) + dayBump
      });
    });
  }
  return rows;
}

const jobs: Job[] = [
  { id: 'JB-19', orderId: 'SO-4418', sku: 'HX-220', lineId: 'L1', station: 'Station 4', qty: 80, done: 51, state: 'running', startedAt: '2026-10-20T13:10:00Z' },
  { id: 'JB-20', orderId: 'SO-4436', sku: 'HX-310', lineId: 'L1', station: 'Station 1', qty: 40, done: 0, state: 'queued' },
  { id: 'JB-21', orderId: 'SO-4422', sku: 'HX-220', lineId: 'L2', station: 'Station 4', qty: 60, done: 18, state: 'held', heldReason: 'Torque gun out of calibration' },
  { id: 'JB-22', orderId: 'SO-4441', sku: 'BR-14', lineId: 'L2', station: 'Station 2', qty: 30, done: 0, state: 'queued' },
  { id: 'JB-23', orderId: 'SO-4459', sku: 'BR-14', lineId: 'L3', station: 'Station 2', qty: 50, done: 22, state: 'running', startedAt: '2026-10-20T12:40:00Z' },
  { id: 'JB-24', orderId: 'SO-4430', sku: 'BR-14', lineId: 'L3', station: 'Pack', qty: 40, done: 40, state: 'done' },
  { id: 'JB-25', orderId: 'SO-4452', sku: 'HX-310', lineId: 'L3', station: 'Station 1', qty: 24, done: 0, state: 'queued' }
];

const alerts: Alert[] = [
  { id: 'AL-1', at: '2026-10-20T13:42:00Z', severity: 'action', lineId: 'L2', text: 'Line 2 held: torque gun out of calibration. SO-4441 is already late.', open: true },
  { id: 'AL-2', at: '2026-10-20T11:05:00Z', severity: 'watch', lineId: 'L1', text: 'Line 1 is 3 units behind the hour. Still inside the day plan.', open: true },
  { id: 'AL-3', at: '2026-10-20T09:20:00Z', severity: 'info', text: 'Changeover on Line 3 started on time.', open: false }
];

export const plantFixture: PlantFixture = {
  asOf: '2026-10-20T14:00:00Z',
  weekStart: '2026-10-19',
  lines, shifts: shifts(), orders, defects: defects(), jobs, alerts
};
