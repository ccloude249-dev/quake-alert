export type Risk = 'verde' | 'amarillo' | 'rojo';

export interface Alert {
  _id?: string;
  targetName: string;
  distanceKm: number;
  arrivalSeconds: number;
  intensity: number;
  risk: Risk;
  channels: string[];
  issuedAt?: string;
}

export interface SeismicEventInput {
  magnitude: number;
  depthKm?: number;
  epicenter: { lat: number; lng: number };
}
