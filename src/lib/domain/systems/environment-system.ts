export interface EnvironmentState {
  temperature: number;
  humidity: number;
  toxins: number;
}

export interface EnvironmentChangedEvent {
  previous: EnvironmentState;
  current: EnvironmentState;
}

export type EnvironmentChangeListener = (event: EnvironmentChangedEvent) => void;

const listeners = new Set<EnvironmentChangeListener>();

export function onEnvironmentChanged(listener: EnvironmentChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitEnvironmentChanged(event: EnvironmentChangedEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}