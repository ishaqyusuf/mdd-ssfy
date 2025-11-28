export interface Project {
  id: string;
  name: string;
}

export interface Unit {
  id: string;
  name: string;
  projectId: string;
}

export interface Task {
  id: string;
  name: string;
  ratePerUnit: number;
}

export const PROJECTS: Project[] = [
  { id: 'proj-1', name: 'Project Alpha' },
  { id: 'proj-2', name: 'Project Beta' },
  { id: 'proj-3', name: 'Project Gamma' },
];

export const UNITS: Unit[] = [
  { id: 'unit-1', name: 'BLK43 LOT27 (1589 LH)', projectId: 'proj-1' },
  { id: 'unit-2', name: 'BLK43 LOT21 (1589 LH)', projectId: 'proj-1' },
  { id: 'unit-3', name: 'BLK12 LOT01 (1200 SH)', projectId: 'proj-2' },
  { id: 'unit-4', name: 'BLK12 LOT02 (1200 SH)', projectId: 'proj-2' },
  { id: 'unit-5', name: 'BLK01 LOT01 (2000 DH)', projectId: 'proj-3' },
];

export const TASKS: Task[] = [
  { id: 'task-1', name: 'Foundation Works', ratePerUnit: 1500 },
  { id: 'task-2', name: 'Framing', ratePerUnit: 2500 },
  { id: 'task-3', name: 'Roofing', ratePerUnit: 1800 },
  { id: 'task-4', name: 'Electrical', ratePerUnit: 2200 },
  { id: 'task-5', name: 'Plumbing', ratePerUnit: 2000 },
];
