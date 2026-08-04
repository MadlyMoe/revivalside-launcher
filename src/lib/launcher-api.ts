import { invoke } from "@tauri-apps/api/core";

export type ServiceName = "listener" | "wiki" | "modside" | "capture";
export type ServicePhase = "stopped" | "starting" | "running" | "stopping";

export interface RevivalSideSettings {
  clientPath: string;
  sourceClientPath: string;
  capturePath: string;
  tcpPort: number;
  httpPort: number;
  wikiPort: number;
  modSidePort: number;
  eventDate: string;
  loginBackground: string;
  lobbyAck: "auto" | "on" | "off";
  allowLanAccess: boolean;
  verboseLogging: boolean;
  replayCapturedGameFlow: boolean;
  skipTutorial: boolean;
  resetTutorialOnLogin: boolean;
  minimizeToTray: boolean;
  notifyServiceStops: boolean;
  advancedEnvironment: string;
  switchToImportedSave: boolean;
  updateMatchingImport: boolean;
  keepOfficialUid: boolean;
  keepOfficialFriendCode: boolean;
}

export interface ServiceStatus {
  state: ServicePhase;
  pid: number | null;
  details: string;
}

export type LauncherServices = Record<ServiceName, ServiceStatus>;

export interface LauncherSnapshot {
  appRoot: string;
  settings: RevivalSideSettings;
  loginBackgrounds: Array<{
    id: number;
    label: string;
    assetName: string;
    music: string;
    contentTag: string;
  }>;
  gameplay: {
    ready: boolean;
    bundleCount: number;
    cachedLuaCount: number;
    description: string;
  };
  routing: {
    state: "missing" | "pending" | "ready";
    message: string;
  };
  dependencies: Record<string, { available: boolean; path: string }>;
  frozenClientRoot: string;
  captures: string[];
  services: LauncherServices;
}

export const DEFAULT_REVIVALSIDE_SETTINGS: RevivalSideSettings = {
  clientPath: "",
  sourceClientPath: "",
  capturePath: "",
  tcpPort: 22000,
  httpPort: 8088,
  wikiPort: 5174,
  modSidePort: 5175,
  eventDate: "2025-04-10",
  loginBackground: "auto",
  lobbyAck: "auto",
  allowLanAccess: false,
  verboseLogging: false,
  replayCapturedGameFlow: false,
  skipTutorial: false,
  resetTutorialOnLogin: false,
  minimizeToTray: true,
  notifyServiceStops: true,
  advancedEnvironment: "",
  switchToImportedSave: true,
  updateMatchingImport: true,
  keepOfficialUid: false,
  keepOfficialFriendCode: false,
};

export const EMPTY_SERVICES: LauncherServices = {
  listener: { state: "stopped", pid: null, details: "" },
  wiki: { state: "stopped", pid: null, details: "" },
  modside: { state: "stopped", pid: null, details: "" },
  capture: { state: "stopped", pid: null, details: "" },
};

export const getLauncherSnapshot = () =>
  invoke<LauncherSnapshot>("launcher_snapshot");

export const runLauncherAction = <T extends object = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
) => invoke<T & { ok: true }>("run_launcher_action", { action, payload });

export const startLauncherService = (service: ServiceName) =>
  invoke<{ state: ServicePhase; pid: number }>("start_launcher_service", {
    service,
  });

export const stopLauncherService = (service: ServiceName) =>
  invoke<void>("stop_launcher_service", { service });
