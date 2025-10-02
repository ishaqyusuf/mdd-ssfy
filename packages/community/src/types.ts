export interface TemplateInputMeta {}

export type ProjectMeta = {
  supervisor: {
    name;
    email;
  };
  media?: string[];
  addon?;
  // modelCost: ICostChart;
  installCosts: InstallCost[];
};
// export type IBuilder = OmitMeta<Builders> & {
//     meta: {
//         address;
//         tasks: IBuilderTasks[];
//     };
//     _count: {
//         projects;
//     };
// };
export interface BuilderTasks {
  billable: boolean;
  name: string;
  produceable: boolean;
  addon: boolean;
  installable: boolean;
  punchout: boolean;
  deco: boolean;
  uid: string;
  invoice_search;
}
// export type IHome = OmitMeta<Homes> & {
//     meta: {};
//     _count: {
//         jobs;
//     };
// };
// export interface ExtendedHome extends IHome {
//     project: IProject;
//     tasks: IHomeTask[];
//     jobs: Jobs[];
// }
export type HomeTaskMeta = {
  system_task: boolean;
  system_task_cost: number;
};

export interface HomeStatus {
  produceables: number;
  produced: number;
  pendingProduction: number;
  productionStatus;
  prodDate;
  badgeColor;
}

export interface CommunityPivotMeta {
  installCost: InstallCostingTemplate<number | string>;
}
export interface CommunityTemplateMeta {
  design: CommunityTemplateDesign;
  modelCost: CostChartMeta;
  installCosts: InstallCost[];
  overrideModelCost: Boolean;
}
export interface HomeTemplateMeta {
  design: HomeTemplateDesign;
  task_costs: { [id in string]: number };
  installCosts: InstallCost[];
}
export type InstallCostingTemplate<T> = {
  [uid in string]: T;
};
export interface InstallCost {
  costings: InstallCosting;
  title?;
  uid?;
}
export type InstallCosting = InstallCostingTemplate<number | string>;
export interface TemplateDesign<T> {
  project: ProjectHeader<T>;
  entry: Entry<T>;
  garageDoor: GarageDoor<T>;
  interiorDoor: InteriorDoor<T>;
  doubleDoor: DoubleDoor<T>;
  bifoldDoor: BifoldDoor<T>;
  lockHardware: LockHardWare<T>;
  decoShutters: DecoShutters<T>;
}
export type HomeTemplateDesign = TemplateDesign<string>;
export type CommunityTemplateDesign = TemplateDesign<string>;

export interface CostChartMeta {
  totalCost;
  syncCompletedTasks: Boolean;
  totalTax;
  grandTotal;
  totalTask;
  tax: { [uid in string]: number };
  costs: { [uid in string]: number };
  sumCosts: { [k in string]: number };
  totalUnits: { [k in string]: number };
  lastSync: {
    date;
    tasks: any;
    units;
  };
}
// export interface ICommunityModelCost extends ICostChartMeta {}
// export interface ICommunityModelCost extends CommunityModelCost {}
export interface ProjectHeader<T> {
  projectName;
  builder;
  modelName;
  lot;
  block;
  address;
  deadbolt;
}
export interface Entry<T> {
  material: T;
  bore: T;
  sixEight: T;
  orientation: T;
  statusColor: T;
  layer: T;
  others: T;
  eightZero: T;
  sideDoor: T;
  size1: T;
  model: T;
}
export interface GarageDoor<T> {
  material: T;
  ph: T;
  frame: T;
  bore: T;
  orientation: T;
  statusColor: T;
  single: T;
  type: T;
  doorHeight: T;
  doorSize: T;
  size1: T;
  model: T;
  doorSize1: T;
  orientation1: T;
}
export interface InteriorDoor<T> {
  style: T;
  jambSize: T;
  casingStyle: T;
  doorType: T;
  orientation1: T;
  height1: T;
  two1Lh: T;
  twoSix1Lh: T;
  twoEight1Rh: T;
  twoTen1Lh: T;
  statusColor: T;
  twoSix1Rh: T;
  twoEight1Lh: T;
  twoTen1Rh: T;
  oneSix1Lh: T;
  twoFour1Rh: T;
  oneSix1Rh: T;
  two1Rh: T;
  twoFour1Lh: T;
  height2: T;
  two2Lh: T;
  twoSix2Lh: T;
  twoTen2Lh: T;
  twoTen2Rh: T;
  twoEight2Lh: T;
  twoSix2Rh: T;
  twoEight2Rh: T;
  two2Rh: T;
  doorSize1: T;
  oneSix2Lh: T;
  oneSix2Rh: T;
  twoFour2Lh: T;
  twoFour2Rh: T;
  three2Rh: T;
  three2Lh: T;
  three1Lh: T;
  three1Rh: T;
}
export interface DoubleDoor<T> {
  statusColor: T;
  specialDoor: T;
  specialDoor3: T;
  pocketDoor: T;
  sixLh: T;
  fiveLh: T;
  others: T;
  specialDoor2: T;
  mirrored: T;
  specialDoor4: T;
  fiveRh: T;
  fiveEightLh: T;
  fiveEightRh: T;
  fourRh: T;
  fourLh: T;
  swingDoor: T;
  fiveFourLh: T;
  fiveFourRh;
  sixRh: T;
}
export interface BifoldDoor<T> {
  style: T;
  five: T;
  twoSix: T;
  twoSixLl: T;
  twoFourLl: T;
  bifoldOther2: T;
  bifoldOther2Qty: T;
  two: T;
  crownQty: T;
  casing: T;
  qty: T;
  scuttle: T;
  scuttleQty: T;
  casingQty: T;
  statusColor: T;
  casingStyle: T;
  six: T;
  oneEight: T;
  oneSix: T;
  twoFour: T;
  three: T;
  fourEight: T;
  twoEightLl: T;
  four: T;
  crown: T;
  twoEight: T;
  palosQty: T;
  threeLl: T;
  one: T;
  bifoldOther1: T;
  bifoldOther1Qty: T;
}
export interface LockHardWare<T> {
  style: T;
  jambSize: T;
  hookAye;
  casingStyle: T;
  doorType: T;
  height1: T;
  twoSix1Lh: T;
  twoEight1Rh: T;
  twoTen1Lh: T;
  statusColor: T;
  handleSet: T;
  deadbolt: T;
  passage: T;
  privacy: T;
  doorStop: T;
  doorViewer: T;
  wStripper: T;
  hinges: T;
  brand: T;
  twoSix1Rh: T;
  twoEight1Lh: T;
  twoTen1Rh: T;
  twoFour1Lh: T;
  twoFour1Rh: T;
  oneSix1Lh: T;
  oneSix1Rh: T;
  two1Lh: T;
  height2: T;
  two2Lh: T;
  twoSix2Lh: T;
  twoSix2Rh: T;
  twoEight2Lh: T;
  twoEight2Rh: T;
  two1Rh: T;
  two2Rh: T;
  size1: T;
  model: T;
  dummy: T;
  oneSix2Lh: T;
}
export interface DecoShutters<T> {
  model: T;
  size2;
  size1: T;
  statusColor: T;
}

export type InputType = "number" | "text";
