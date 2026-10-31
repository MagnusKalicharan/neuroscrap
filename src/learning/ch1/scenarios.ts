export type Decision = 'OPEN' | 'SHUT';

export interface Scenario {
  id: number;
  name: string;
  icon: string;
  inputs: {
    air: number;        // x1: 0 = toxic, 1 = clean
    temp: number;       // x2: 0 = deadly, 1 = comfortable
    radiation: number;  // x3: 0 = none, 1 = extreme
  };
  expected: Decision;
  description: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    name: 'Calm planet',
    icon: '☀️',
    inputs: { air: 0.9, temp: 0.8, radiation: 0.1 },
    expected: 'OPEN',
    description: 'Clean air, mild temperature, trace radiation.',
  },
  {
    id: 2,
    name: 'Toxic fog',
    icon: '🌫️',
    inputs: { air: 0.1, temp: 0.7, radiation: 0.2 },
    expected: 'SHUT',
    description: 'Deadly toxic atmosphere despite pleasant temperature.',
  },
  {
    id: 3,
    name: 'Radiation storm',
    icon: '⚡',
    inputs: { air: 0.9, temp: 0.8, radiation: 0.9 },
    expected: 'SHUT',
    description: 'Lethal cosmic radiation storm despite clear air.',
  },
  {
    id: 4,
    name: 'Freezing night',
    icon: '❄️',
    inputs: { air: 0.8, temp: 0.1, radiation: 0.2 },
    expected: 'SHUT',
    description: 'Sub-zero thermal hazard will freeze hydraulic fluid.',
  },
  {
    id: 5,
    name: 'Mild morning',
    icon: '🌅',
    inputs: { air: 0.7, temp: 0.6, radiation: 0.2 },
    expected: 'OPEN',
    description: 'Acceptable atmospheric conditions across all sensors.',
  },
  {
    id: 6,
    name: 'Dust and radiation',
    icon: '☢️',
    inputs: { air: 0.5, temp: 0.5, radiation: 0.6 },
    expected: 'SHUT',
    description: 'Marginal air quality coupled with dangerous radiation.',
  },
];

export const KNOWN_SOLUTION = {
  w1: 1.5,
  w2: 1.0,
  w3: -1.5,
  b: -1.2,
};

export const DEFAULT_WEIGHTS = {
  w1: 0.5,
  w2: 0.5,
  w3: 0.5,
  b: 0.0,
};
