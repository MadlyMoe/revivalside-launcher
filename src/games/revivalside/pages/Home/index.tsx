import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  BookOpenIcon,
  ChevronDownIcon,
  FolderOpenIcon,
  MenuIcon,
  PauseIcon,
  PlayIcon,
  RocketIcon,
  SettingsIcon,
  SnowflakeIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import { LogViewer } from "@/components/log-viewer";
import { useEffect, useState } from "react";
import logo from "@/assets/revivalside/logo.webp";
import { ActionButton } from "@/games/revivalside/pages/Home/ActionButton";
import { useLauncherState } from "@/components/providers/launcher-state-provider";
import { GameSettings } from "@/games/revivalside/pages/Home/GameSettings";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { ServerLaunchButton } from "@/games/revivalside/pages/Home/server-launch-button";

export const Home = () => {
  const {
    snapshot,
    settings,
    services,
    busyAction,
    lastError,
    clearError,
    startService,
    stopService,
    runAction,
  } = useLauncherState();
  const [open, setOpen] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [openWikiWhenReady, setOpenWikiWhenReady] = useState(false);
  const [openModSideWhenReady, setOpenModSideWhenReady] = useState(false);
  const [modSideProgress, setModSideProgress] = useState(0);
  const listener = services.listener;
  const wiki = services.wiki;
  const modside = services.modside;
  const listenerBusy =
    listener.state === "starting" || listener.state === "stopping";

  useEffect(() => {
    if (openWikiWhenReady && wiki.state === "running") {
      setOpenWikiWhenReady(false);
      void openUrl(`http://127.0.0.1:${settings.wikiPort}/`);
    }
  }, [openWikiWhenReady, settings.wikiPort, wiki.state]);

  useEffect(() => {
    if (openModSideWhenReady && modside.state === "running") {
      setOpenModSideWhenReady(false);
      void openUrl(
        `http://127.0.0.1:${settings.modSidePort}/mod-side`,
      );
    }
  }, [openModSideWhenReady, settings.modSidePort, modside.state]);

  useEffect(() => {
    const unlisten = listen<{ type: string; action: string; progress: number }>(
      "launcher-event",
      ({ payload }) => {
        if (
          payload.type === "action-progress" &&
          payload.action === "extract-modside-assets"
        ) {
          setModSideProgress(payload.progress);
        }
      },
    );
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, []);

  const toggleListener = () => {
    if (listener.state === "running") void stopService("listener");
    else if (listener.state === "stopped") void startService("listener");
  };

  const listenerButton = () => {
    if (listener.state === "running")
      return { icon: <PauseIcon color="relative" />, text: "Stop Server" };
    if (listener.state === "starting")
      return { icon: <Spinner />, text: listener.details || "Starting..." };
    if (listener.state === "stopping")
      return { icon: <Spinner />, text: "Stopping..." };
    return { icon: <PlayIcon color="relative" />, text: "Start Game" };
  };

  const openWiki = async () => {
    if (wiki.state === "running") {
      await openUrl(`http://127.0.0.1:${settings.wikiPort}/`);
      return;
    }
    setOpenWikiWhenReady(true);
    try {
      await startService("wiki");
    } catch {
      setOpenWikiWhenReady(false);
    }
  };

  const openModSide = async () => {
    try {
      const { assets } = await runAction<{
        assets: {
          ready: boolean;
          requiredGiB: number;
          availableGiB: number;
          hasSpace: boolean;
        };
      }>("prepare-modside-assets");
      if (!assets.ready) {
        const warning = `Asset:Side, Story:Side, Unit:Side, Combat:Side, and Spine Studio need the extracted client asset library. Mod Creator and Mod Loader work without it. Full extraction requires at least ${assets.requiredGiB} GB of free space; this drive currently has ${assets.availableGiB} GB available.`;
        if (!assets.hasSpace) {
          await message(warning, {
            title: "Not enough free space",
            kind: "info",
          });
        } else {
          const accepted = await confirm(
            `${warning}\n\nExtract now, or open the core tools only?`,
            {
              title: "Mod:Side asset library",
              kind: "warning",
              okLabel: "Extract assets",
              cancelLabel: "Core tools only",
            },
          );
          if (accepted) {
            setModSideProgress(0);
            await runAction("extract-modside-assets", { confirmed: true });
          }
        }
      }
    } catch { /* Creator and Loader still open when asset preparation is unavailable. */ }
    if (modside.state === "running") {
      await openUrl(
        `http://127.0.0.1:${settings.modSidePort}/mod-side`,
      );
      return;
    }
    setOpenModSideWhenReady(true);
    try {
      await startService("modside");
    } catch {
      setOpenModSideWhenReady(false);
    }
  };

  const button = listenerButton();
  const routingReady = snapshot?.routing.state === "ready";
  const modSideBusy = busyAction?.includes("modside-assets") ?? false;

  return (
    <>
      <div className="relative flex h-full min-h-0 flex-1 flex-col">
        <img src={logo} className="w-sm" alt="RevivalSide" />
        <div className="absolute bottom-0 left-0 flex w-full max-w-xl flex-col gap-4">
          {lastError && (
            <Card className="max-w-2xl bg-destructive/15 border-destructive/40 backdrop-blur-3xl">
              <CardContent className="flex items-start gap-3 text-sm">
                <span className="flex-1">{lastError}</span>
                <button onClick={clearError} aria-label="Dismiss error">
                  <XIcon className="size-4" />
                </button>
              </CardContent>
            </Card>
          )}
          <div className="flex w-full flex-col gap-2">
            <div className="flex gap-2">
              <ActionButton
                tooltip="User Manager"
                disabled={listener.state !== "running"}
                onClick={() =>
                  openUrl(`http://127.0.0.1:${settings.httpPort}/user-manager`)
                }
              >
                <UsersRoundIcon />
              </ActionButton>
              <ActionButton
                tooltip={wiki.state === "starting" ? "Starting Wiki" : "Wiki"}
                onClick={openWiki}
              >
                {wiki.state === "starting" ? <Spinner /> : <BookOpenIcon />}
              </ActionButton>
              <ActionButton
                tooltip={snapshot?.frozenClientRoot ? "Frozen client already exists" : "Freeze Client"}
                disabled={
                  !settings.sourceClientPath ||
                  !!snapshot?.frozenClientRoot ||
                  !!busyAction ||
                  listener.state !== "stopped"
                }
                onClick={() => void runAction("freeze-client")}
              >
                {busyAction === "freeze-client" ? (
                  <Spinner />
                ) : (
                  <SnowflakeIcon />
                )}
              </ActionButton>
              <ActionButton
                tooltip={
                  modSideBusy
                    ? `Preparing Mod:Side assets (${modSideProgress}%)`
                    : modside.state === "starting"
                      ? "Starting Mod:Side"
                      : "Open Mod:Side"
                }
                disabled={!!busyAction || modside.state === "stopping"}
                onClick={() => void openModSide()}
              >
                {modSideBusy || modside.state === "starting" ? (
                  <span
                    className="relative grid size-7 place-items-center"
                    role="progressbar"
                    aria-label="Preparing Mod:Side assets"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={modSideProgress}
                  >
                    <svg
                      className="absolute inset-0 size-7 -rotate-90"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="text-foreground/25"
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <circle
                        className="text-primary transition-[stroke-dashoffset] duration-300"
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - modSideProgress}
                      />
                    </svg>
                    <RocketIcon className="size-3.5" />
                  </span>
                ) : (
                  <RocketIcon />
                )}
              </ActionButton>
            </div>

            <Card className="bg-card/20 backdrop-blur-3xl py-3">
              <CardContent className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      routingReady ? "bg-green-500" : "bg-amber-400",
                    )}
                  />
                  <span>
                    {snapshot?.routing.message ?? "Checking client routing..."}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Gameplay cache:{" "}
                  {snapshot?.gameplay.description ?? "Checking..."}
                </div>
                <div className="text-muted-foreground">
                  {listener.state === "starting"
                    ? `Start flow: ${listener.details || "Preparing local services"}`
                    : listener.state === "running"
                      ? listener.details
                      : "Start patches the frozen client, waits for all local services, then launches it automatically."}
                </div>
              </CardContent>
            </Card>

            <Collapsible open={open} onOpenChange={setOpen}>
              <Card
                className={cn(
                  "bg-card/20 backdrop-blur-3xl transition-colors hover:bg-foreground/10",
                  open ? "rounded-b-none" : "",
                )}
              >
                <CardContent>
                  <CollapsibleTrigger asChild>
                    <button className="w-full uppercase flex items-stretch group">
                      <span className="font-semibold uppercase tracking-widest">
                        Logs
                      </span>
                      <ChevronDownIcon className="ml-auto rotate-0 group-data-[state=open]:rotate-180 transition-transform" />
                    </button>
                  </CollapsibleTrigger>
                </CardContent>
              </Card>
              <CollapsibleContent className="ring-1 ring-foreground/10 rounded-lg rounded-t-none">
                <LogViewer
                  className="w-full bg-transparent backdrop-blur-3xl rounded-t-none border-none"
                  bodyClassName="h-[clamp(10rem,28vh,16rem)]!"
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <div className="absolute bottom-0 right-0 z-10 flex items-end gap-2">
          <ServerLaunchButton
            onClick={toggleListener}
            disabled={listenerBusy}
            tooltip={
              listener.state === "starting"
                ? "Preparing local services"
                : undefined
            }
            state={{
              mode: "action",
              icon: button.icon,
              text: button.text,
              hoverIcon:
                listener.state === "running" ? (
                  <PauseIcon color="relative" />
                ) : undefined,
              hoverText:
                listener.state === "running" ? "Stop Server" : undefined,
            }}
          />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <ActionButton size="action-icon">
                <MenuIcon />
              </ActionButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-fit" side="top" align="end">
              <DropdownMenuItem
                disabled={!snapshot}
                onClick={() =>
                  snapshot &&
                  openPath(snapshot.frozenClientRoot || snapshot.appRoot)
                }
              >
                <FolderOpenIcon />
                Browse Local Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowGameSettings(true)}>
                <SettingsIcon />
                Game Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <GameSettings
        open={showGameSettings}
        onOpenChange={setShowGameSettings}
      />
    </>
  );
};
