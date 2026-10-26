import type { Alert, Job, Line, Order, PlantFixture, Shift } from './types';

export interface LineStatus {
  line: Line;
  attainment: number;
  openAlerts: number;
}

export function lineStatus(plant: PlantFixture): LineStatus[] {
  return plant.lines.map(line => ({
    line,
    attainment: line.targetThisHour === 0 ? 0 : line.goodThisHour / line.targetThisHour,
    openAlerts: plant.alerts.filter(alert => alert.open && alert.lineId === line.id).length
  }));
}

export interface HourPoint { hour: string; good: number; target: number; }

/** The current hour is measured; earlier hours are the line's recorded pace. */
export function hourSeries(plant: PlantFixture, lineId: string): HourPoint[] {
  const line = plant.lines.find(item => item.id === lineId) ?? plant.lines[0];
  const asOf = new Date(plant.asOf);
  return Array.from({ length: 8 }, (_, index) => {
    const hour = new Date(asOf.getTime() - (7 - index) * 3600_000);
    const current = index === 7;
    return {
      hour: hour.toISOString().slice(11, 16),
      good: current ? line.goodThisHour : Math.round(line.targetPerHour * (line.id === 'L2' ? 0.9 : 0.98)),
      target: line.targetPerHour
    };
  });
}

export function openAlerts(plant: PlantFixture): Alert[] {
  return plant.alerts.filter(alert => alert.open);
}

export function ordersAtRisk(plant: PlantFixture): Order[] {
  return plant.orders.filter(order => order.state === 'at-risk' || order.state === 'late');
}

export function weekShifts(plant: PlantFixture, lineId?: string): Shift[] {
  return plant.shifts.filter(shift => !lineId || shift.lineId === lineId);
}

export interface OrderPace {
  order: Order;
  remaining: number;
  daysToDue: number;
  perDayNeeded: number;
}

export function orderPace(plant: PlantFixture, asOf = plant.asOf): OrderPace[] {
  const today = new Date(asOf.slice(0, 10) + 'T00:00:00Z').getTime();
  return plant.orders.map(order => {
    const remaining = Math.max(0, order.qty - order.done);
    const daysToDue = Math.round((new Date(order.due + 'T00:00:00Z').getTime() - today) / 86_400_000);
    return { order, remaining, daysToDue, perDayNeeded: daysToDue <= 0 ? remaining : Math.ceil(remaining / daysToDue) };
  });
}

export function jobsByState(plant: PlantFixture, state: Job['state']): Job[] {
  return plant.jobs.filter(job => job.state === state);
}

const DEFECT_UNIT_COST: Record<string, number> = {
  'Torque out of range': 42,
  'Seal nick': 28,
  'Label mismatch': 6,
  'Bore oversize': 55,
  'Cosmetic scratch': 9
};

/** Scrap dollars. Pass a YYYY-MM-DD to limit the sum to that day. */
export function scrapCost(plant: PlantFixture, date?: string): number {
  return plant.defects
    .filter(row => !date || row.date === date)
    .reduce((sum, row) => sum + row.count * (DEFECT_UNIT_COST[row.type] ?? 0), 0);
}

export function scenarioDay(plant: PlantFixture): string {
  return plant.asOf.slice(0, 10);
}

export function previousDay(isoDay: string): string {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export interface AttentionItem {
  id: string;
  tone: 'bad' | 'watch';
  label: string;
  title: string;
  detail: string;
  href: string;
}

function usDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${month}/${day}/${year}`;
}

/** Late orders, at-risk orders, and open pace alerts, each with the reason it is on the list. */
export function attentionItems(plant: PlantFixture): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const order of ordersAtRisk(plant)) {
    const remaining = order.qty - order.done;
    const line = plant.lines.find(item => item.id === order.lineId);
    const held = line?.state === 'held';
    const late = order.state === 'late';
    const hold = held && line?.heldReason ? ` ${line.name} held: ${line.heldReason}.` : held ? ` ${line?.name ?? 'Line'} is held.` : '';
    items.push({
      id: order.id,
      tone: late ? 'bad' : 'watch',
      label: late ? 'Late' : 'At risk',
      title: `${order.id} · ${order.customer}`,
      detail: late
        ? `Due ${usDate(order.due)}. ${remaining} of ${order.qty} still open.${hold}`
        : `${remaining} of ${order.qty} still open before ${usDate(order.due)}.${hold}`,
      href: `/orders?order=${order.id}`
    });
  }
  for (const alert of openAlerts(plant)) {
    if (alert.severity === 'info' || alert.id === 'AL-1') continue;
    const line = plant.lines.find(item => item.id === alert.lineId);
    items.push({
      id: alert.id,
      tone: alert.severity === 'action' ? 'bad' : 'watch',
      label: alert.severity === 'action' ? 'Hold' : 'Watch',
      title: line?.name ?? 'Plant',
      detail: alert.text,
      href: '/floor'
    });
  }
  return items;
}

export interface DowntimeRow {
  line: string;
  Changeover: number;
  Breakdown: number;
  Material: number;
  'Quality hold': number;
}

const DOWNTIME: Record<string, Omit<DowntimeRow, 'line'>> = {
  L1: { Changeover: 0.8, Breakdown: 0.2, Material: 0.1, 'Quality hold': 0.1 },
  L2: { Changeover: 0.6, Breakdown: 3.4, Material: 0.4, 'Quality hold': 2.1 },
  L3: { Changeover: 0.9, Breakdown: 0.1, Material: 0.2, 'Quality hold': 0 }
};

export function downtimeByLine(plant: PlantFixture): DowntimeRow[] {
  return plant.lines.map(line => ({
    line: line.name,
    ...(DOWNTIME[line.id] ?? { Changeover: 0, Breakdown: 0, Material: 0, 'Quality hold': 0 })
  }));
}

export interface ParetoPoint {
  code: string;
  count: number;
  share: number;
  cumulative: number;
}

export function paretoPoints(plant: PlantFixture): ParetoPoint[] {
  const map = new Map<string, number>();
  for (const row of plant.defects) map.set(row.type, (map.get(row.type) ?? 0) + row.count);
  const ranked = [...map.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count);
  const total = ranked.reduce((sum, row) => sum + row.count, 0);
  let running = 0;
  return ranked.map((row, index) => {
    running += row.count;
    const share = total === 0 ? 0 : (row.count / total) * 100;
    const cumulative = total === 0 ? 0 : (running / total) * 100;
    return {
      code: row.code,
      count: row.count,
      share: Math.round(share * 10) / 10,
      cumulative: index === ranked.length - 1 ? 100 : Math.round(cumulative * 10) / 10
    };
  });
}

export function plantOee(plant: PlantFixture): { availability: number; performance: number; quality: number; oee: number } {
  const planned = plant.shifts.length * 480;
  const down = plant.shifts.reduce((sum, shift) => sum + shift.downtimeMin, 0);
  const good = plant.shifts.reduce((sum, shift) => sum + shift.goodUnits, 0);
  const made = plant.shifts.reduce((sum, shift) => sum + shift.goodUnits + shift.scrapUnits, 0);
  const target = plant.shifts.reduce((sum, shift) => sum + shift.plannedUnits, 0);
  const availability = planned === 0 ? 0 : (planned - down) / planned;
  const performance = target === 0 ? 0 : made / target;
  const quality = made === 0 ? 0 : good / made;
  return { availability, performance, quality, oee: availability * performance * quality };
}
