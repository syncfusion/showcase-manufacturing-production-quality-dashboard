import { describe, expect, it } from 'vitest';
import { plantFixture } from '../data/plant';
import { attentionItems, lineStatus, orderPace, ordersAtRisk, paretoPoints, plantOee, previousDay, scenarioDay, scrapCost } from './selectors';

describe('plant selectors', () => {
  it('marks Line 2 short of the hour', () => {
    const line2 = lineStatus(plantFixture).find(row => row.line.id === 'L2');
    expect(line2?.attainment).toBeLessThan(0.5);
    expect(line2?.line.state).toBe('held');
  });

  it('finds the late and at-risk orders', () => {
    expect(ordersAtRisk(plantFixture).map(order => order.id)).toEqual(['SO-4422', 'SO-4441']);
  });

  it('needs the whole remainder today for a late order', () => {
    const late = orderPace(plantFixture).find(row => row.order.id === 'SO-4441');
    expect(late?.daysToDue).toBe(0);
    expect(late?.perDayNeeded).toBe(60);
  });

  it('keeps OEE between 0 and 1', () => {
    const oee = plantOee(plantFixture);
    expect(oee.oee).toBeGreaterThan(0.7);
    expect(oee.oee).toBeLessThan(1);
  });

  it('gives each Tuesday shift a title-case name and a distinct lead', () => {
    const tuesday = plantFixture.shifts.filter(shift => shift.date === '2026-10-20');
    expect(tuesday).toHaveLength(9);
    expect(new Set(tuesday.map(shift => shift.lead)).size).toBe(9);
    expect(tuesday.every(shift => shift.shiftName === 'Morning' || shift.shiftName === 'Afternoon' || shift.shiftName === 'Night')).toBe(true);
    expect(tuesday.every(shift => shift.shiftName.toLowerCase() === shift.shift)).toBe(true);
  });

  it('says why a late order is on the attention list', () => {
    const late = attentionItems(plantFixture).find(item => item.id === 'SO-4441');
    expect(late?.label).toBe('Late');
    expect(late?.detail).toContain('still open');
    expect(late?.detail).toContain('Torque gun');
  });

  it('prices the scenario day above the prior day', () => {
    const day = scenarioDay(plantFixture);
    expect(scrapCost(plantFixture, day)).toBeGreaterThan(scrapCost(plantFixture, previousDay(day)));
  });

  it('ranks defects and closes the Pareto at 100 percent', () => {
    const points = paretoPoints(plantFixture);
    expect(points[0].count).toBeGreaterThan(points[1].count);
    expect(points[points.length - 1].cumulative).toBe(100);
  });
});
