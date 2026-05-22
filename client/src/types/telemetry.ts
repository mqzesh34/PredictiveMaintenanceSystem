export type TelemetryData = {
  udi?: number;
  productId?: string;
  type?: string;
  timestamp?: string;
  airTemperature?: number;
  processTemperature?: number;
  rotationalSpeed?: number;
  torque?: number;
  toolWear?: number;
  machineFailure?: number;
  twf?: number;
  hdf?: number;
  pwf?: number;
  osf?: number;
  rnf?: number;
};
