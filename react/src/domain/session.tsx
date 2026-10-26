import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { plantFixture } from '../data/plant';
import type { PlantFixture } from './types';

interface Session {
  plant: PlantFixture;
  reset: () => void;
  holdLine: (lineId: string, reason: string) => void;
  releaseLine: (lineId: string) => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [plant, setPlant] = useState<PlantFixture>(plantFixture);
  const value = useMemo<Session>(() => ({
    plant,
    reset: () => setPlant(plantFixture),
    holdLine: (lineId, reason) => setPlant(current => ({
      ...current,
      lines: current.lines.map(line => line.id === lineId ? { ...line, state: 'held', heldReason: reason } : line)
    })),
    releaseLine: lineId => setPlant(current => ({
      ...current,
      lines: current.lines.map(line => line.id === lineId ? { ...line, state: 'running', heldReason: undefined } : line)
    }))
  }), [plant]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}
