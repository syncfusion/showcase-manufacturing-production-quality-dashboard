import type { PlantFixture } from './types';
import { lineStatus, ordersAtRisk, plantOee } from './selectors';

const SCOPE = 'All lines, Oct 19–25, 2026';

export function sampleAnswer(plant: PlantFixture, prompt: string): string {
  const text = prompt.toLowerCase();
  if (text.includes('oee') || text.includes('miss')) {
    const oee = plantOee(plant);
    const short = lineStatus(plant).filter(row => row.attainment < 0.85);
    const names = short.map(row => row.line.name).join(', ') || 'no line';
    return `${SCOPE}. Sample AI. Plant OEE is ${(oee.oee * 100).toFixed(1)} percent against the 85 target. Short this hour: ${names}.`;
  }
  if (text.includes('critical') || text.includes('order')) {
    const ids = ordersAtRisk(plant).map(order => order.id).join(', ') || 'none';
    return `${SCOPE}. Sample AI. Critical-path orders: ${ids}.`;
  }
  if (text.includes('defect')) {
    return `${SCOPE}. Sample AI. Top defect code is torque out of range, mostly on Line 2.`;
  }
  return 'Sample AI. I can explain an OEE miss, list critical-path orders, or name the top defect code.';
}
