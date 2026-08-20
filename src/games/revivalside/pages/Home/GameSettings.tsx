import { useLauncherState } from "@/components/providers/launcher-state-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  FieldGroup,
  Field,
  FieldSet,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSetGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ask, open as openDialog } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { LOBBY_ACK_OPTIONS } from "@/lib/schema";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, type ComponentProps, type FC } from "react";

const localDateTimeValue = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

interface TailscaleSetupResult {
  installed: boolean;
  connected: boolean;
  configured?: boolean;
  message: string;
  downloadUrl?: string;
  loginUrl?: string;
  shareCode?: string;
}

export const GameSettings: FC<ComponentProps<typeof Dialog>> = ({
  ...props
}) => {
  const {
    snapshot,
    settings,
    setSetting,
    services,
    busyAction,
    lastError,
    saveSettings,
    resetSettings,
    runAction,
  } = useLauncherState();
  const [serverTime, setServerTime] = useState(localDateTimeValue);
  const [tailscaleMessage, setTailscaleMessage] = useState(
    "Host clicks once and sends the copied code. Guest pastes it and clicks once.",
  );
  const listenerLocked = services.listener.state !== "stopped";
  const relayPvpMode =
    settings.privatePvpMode === "host" || settings.privatePvpMode === "join";
  const legacyPvpMode =
    settings.privatePvpMode === "legacy-host" ||
    settings.privatePvpMode === "legacy-join";

  const reset = async () => {
    const confirmed = await ask(
      "Reset every RevivalSide launcher setting to its default?",
      {
        title: "Reset launcher settings",
        kind: "warning",
      },
    );
    if (confirmed) await resetSettings();
  };

  const browseSourceClient = async () => {
    const selected = await openDialog({
      title: "Select CounterSide Assembly-CSharp.dll",
      multiple: false,
      directory: false,
      filters: [{ name: "CounterSide managed assembly", extensions: ["dll"] }],
    });
    if (typeof selected === "string")
      await runAction("set-source-client", { path: selected });
  };

  const browseRelayFile = async (
    key:
      | "relaySshKeyPath"
      | "relayTlsCertificatePath"
      | "relayTlsPrivateKeyPath",
    title: string,
  ) => {
    const selected = await openDialog({ title, multiple: false, directory: false });
    if (typeof selected === "string") setSetting(key, selected);
  };

  const runTailscaleSetup = async (
    action: "tailscale-status" | "configure-tailscale-host" | "configure-tailscale-guest",
  ) => {
    try {
      const result = await runAction<TailscaleSetupResult>(
        action,
        action === "configure-tailscale-guest"
          ? { hostCode: settings.privatePvpHostUrl }
          : undefined,
      );
      setTailscaleMessage(result.message);
      if (result.shareCode) await writeText(result.shareCode);
      if (!result.installed && result.downloadUrl) await openUrl(result.downloadUrl);
      else if (!result.connected && result.loginUrl) await openUrl(result.loginUrl);
    } catch {
      // The shared launcher state displays the backend's actionable error.
    }
  };

  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-4xl" showCloseButton={false}>
        <Tabs className="gap-6" defaultValue="general" orientation="vertical">
          <TabsList variant="clear">
            <TabsTrigger size="xl" value="general">
              General
            </TabsTrigger>
            <TabsTrigger size="xl" value="listener">
              Listener
            </TabsTrigger>
            <TabsTrigger size="xl" value="pvp">
              PvP
            </TabsTrigger>
            <TabsTrigger size="xl" value="advanced">
              Advanced
            </TabsTrigger>
          </TabsList>
          <ScrollArea className="h-132 w-full">
            <TabsContent value="general">
              <FieldSet>
                <FieldLegend>Game client</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel>RevivalSide client</FieldLabel>
                    <Input
                      value={settings.clientPath}
                      readOnly
                      placeholder="No frozen client installed"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="lg"
                        onClick={() => void runAction("launch-client")}
                        disabled={
                          !snapshot?.frozenClientRoot ||
                          services.listener.state !== "running" ||
                          !!busyAction
                        }
                      >
                        <Spinner hidden={busyAction !== "launch-client"} />
                        Relaunch Frozen
                      </Button>
                    </div>
                    <FieldDescription>
                      {snapshot?.routing.message ??
                        "Checking client routing..."}
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel>CounterSide source client</FieldLabel>
                    <Input
                      value={settings.sourceClientPath}
                      readOnly
                      placeholder="Detect or select an official CounterSide install"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => void runAction("detect-client")}
                        disabled={!!busyAction || listenerLocked}
                      >
                        <Spinner hidden={busyAction !== "detect-client"} />
                        Detect CounterSide
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => void browseSourceClient()}
                        disabled={!!busyAction || listenerLocked}
                      >
                        Browse DLL
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => void runAction("freeze-client")}
                        disabled={
                          !settings.sourceClientPath ||
                          !!snapshot?.frozenClientRoot ||
                          !!busyAction ||
                          listenerLocked
                        }
                      >
                        <Spinner hidden={busyAction !== "freeze-client"} />
                        Freeze Selected Client
                      </Button>
                    </div>
                    <FieldDescription>
                      Freeze copies an existing official install into
                      RevivalSide, applies offline routing and Steam isolation,
                      and leaves the client's content-version and table loading
                      intact.
                    </FieldDescription>
                  </Field>
                </FieldGroup>
                <FieldGroup>
                  <Field orientation="horizontal">
                    <Switch
                      id="service-notifications"
                      checked={settings.notifyServiceStops}
                      onCheckedChange={(checked) =>
                        setSetting("notifyServiceStops", checked)
                      }
                    />
                    <FieldLabel htmlFor="service-notifications">
                      Notify when a background service stops unexpectedly
                    </FieldLabel>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </TabsContent>
            <TabsContent value="listener">
              <FieldSet>
                <FieldLegend>Listener</FieldLegend>
                <FieldDescription>
                  Port and server behavior changes take effect the next time the
                  listener starts.
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="tcp-port">TCP</FieldLabel>
                    <Input
                      id="tcp-port"
                      type="number"
                      min={1}
                      max={65535}
                      value={settings.tcpPort}
                      onChange={(event) =>
                        setSetting("tcpPort", Number(event.target.value))
                      }
                      disabled={listenerLocked}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="http-port">HTTP</FieldLabel>
                    <Input
                      id="http-port"
                      type="number"
                      min={1}
                      max={65535}
                      value={settings.httpPort}
                      onChange={(event) =>
                        setSetting("httpPort", Number(event.target.value))
                      }
                      disabled={listenerLocked}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="wiki-port">Wiki</FieldLabel>
                    <Input
                      id="wiki-port"
                      type="number"
                      min={1}
                      max={65535}
                      value={settings.wikiPort}
                      onChange={(event) =>
                        setSetting("wikiPort", Number(event.target.value))
                      }
                      disabled={services.wiki.state !== "stopped"}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="modside-port">Mod:Side</FieldLabel>
                    <Input
                      id="modside-port"
                      type="number"
                      min={1}
                      max={65535}
                      value={settings.modSidePort}
                      onChange={(event) =>
                        setSetting("modSidePort", Number(event.target.value))
                      }
                      disabled={services.modside.state !== "stopped"}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="event-date">Event Date</FieldLabel>
                    <Input
                      id="event-date"
                      type="date"
                      value={settings.eventDate}
                      onChange={(event) =>
                        setSetting("eventDate", event.target.value)
                      }
                      disabled={listenerLocked}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Login background</FieldLabel>
                    <Select
                      value={settings.loginBackground}
                      onValueChange={(value) =>
                        setSetting("loginBackground", value)
                      }
                      disabled={listenerLocked}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="auto">
                            Automatic (event interval)
                          </SelectItem>
                          {(snapshot?.loginBackgrounds ?? []).map(
                            (background) => (
                              <SelectItem
                                key={background.id}
                                value={String(background.id)}
                              >
                                {background.label} ({background.id})
                              </SelectItem>
                            ),
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Controls the main menu shown before login. Automatic
                      matches the active event intervals after the listener
                      restarts.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel>Lobby ACK</FieldLabel>
                    <Select
                      value={settings.lobbyAck}
                      onValueChange={(value) =>
                        setSetting(
                          "lobbyAck",
                          value as typeof settings.lobbyAck,
                        )
                      }
                      disabled={listenerLocked}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {LOBBY_ACK_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
                <FieldGroup>
                  {[
                    [
                      "allowLanAccess",
                      "lan-access",
                      "Allow LAN User Manager access",
                    ],
                    ["verboseLogging", "verbose-logs", "Verbose listener logs"],
                    [
                      "replayCapturedGameFlow",
                      "replay-capture",
                      "Replay captured game flow",
                    ],
                    ["skipTutorial", "skip-tutorial", "Skip tutorial to win"],
                    [
                      "resetTutorialOnLogin",
                      "reset-tutorial",
                      "Reset tutorial on login",
                    ],
                  ].map(([key, id, label]) => (
                    <Field orientation="horizontal" key={key}>
                      <Switch
                        id={id}
                        checked={
                          settings[key as keyof typeof settings] as boolean
                        }
                        onCheckedChange={(checked) =>
                          setSetting(
                            key as keyof typeof settings,
                            checked as never,
                          )
                        }
                        disabled={listenerLocked}
                      />
                      <FieldLabel htmlFor={id}>{label}</FieldLabel>
                    </Field>
                  ))}
                </FieldGroup>
              </FieldSet>
            </TabsContent>
            <TabsContent value="pvp">
              <FieldSetGroup>
                <FieldSet>
                  <FieldLegend>Easy Legacy P2P with Tailscale</FieldLegend>
                  <FieldDescription>
                    Both PCs install Tailscale and sign into the same tailnet once.
                    RevivalSide detects the private address, checks the guest can
                    reach the host, and fills the Legacy P2P settings automatically.
                  </FieldDescription>
                  <FieldGroup>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="lg"
                        variant="secondary"
                        disabled={!!busyAction || listenerLocked}
                        onClick={() => void runTailscaleSetup("tailscale-status")}
                      >
                        <Spinner hidden={busyAction !== "tailscale-status"} />
                        Install / connect Tailscale
                      </Button>
                      <Button
                        size="lg"
                        disabled={!!busyAction || listenerLocked}
                        onClick={() => void runTailscaleSetup("configure-tailscale-host")}
                      >
                        <Spinner hidden={busyAction !== "configure-tailscale-host"} />
                        Host & copy code
                      </Button>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="tailscale-host-code">
                        Guest: paste the host code
                      </FieldLabel>
                      <Input
                        id="tailscale-host-code"
                        value={settings.privatePvpHostUrl}
                        placeholder="http://100.64.0.10:8088"
                        onChange={(event) =>
                          setSetting("privatePvpHostUrl", event.target.value)
                        }
                        disabled={listenerLocked}
                      />
                      <Button
                        size="lg"
                        disabled={
                          !settings.privatePvpHostUrl || !!busyAction || listenerLocked
                        }
                        onClick={() => void runTailscaleSetup("configure-tailscale-guest")}
                      >
                        <Spinner hidden={busyAction !== "configure-tailscale-guest"} />
                        Join host
                      </Button>
                    </Field>
                    <FieldDescription>{tailscaleMessage}</FieldDescription>
                    {lastError && <FieldDescription>{lastError}</FieldDescription>}
                  </FieldGroup>
                </FieldSet>

                <FieldSet>
                  <FieldLegend>Friendly Battle connection</FieldLegend>
                  <FieldDescription>
                    Both players need the same frozen client and content
                    version. Relay changes take effect when the listener next
                    starts.
                  </FieldDescription>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Connection mode</FieldLabel>
                      <Select
                        value={settings.privatePvpMode}
                        onValueChange={(value) =>
                          setSetting(
                            "privatePvpMode",
                            value as typeof settings.privatePvpMode,
                          )
                        }
                        disabled={listenerLocked}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="off">Disabled</SelectItem>
                            <SelectItem value="host">Relay: Host a match</SelectItem>
                            <SelectItem value="join">Relay: Join a host</SelectItem>
                            <SelectItem value="legacy-host">
                              Legacy P2P: Host (LAN/VPN)
                            </SelectItem>
                            <SelectItem value="legacy-join">
                              Legacy P2P: Join (LAN/VPN)
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    {relayPvpMode && (
                      <>
                        <Field>
                          <FieldLabel htmlFor="pvp-relay-url">Relay URL</FieldLabel>
                          <Input
                            id="pvp-relay-url"
                            type="url"
                            value={settings.privatePvpRelayUrl}
                            placeholder="https://relay.example.com"
                            onChange={(event) =>
                              setSetting("privatePvpRelayUrl", event.target.value)
                            }
                            disabled={listenerLocked}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="pvp-relay-secret">
                            Relay access secret
                          </FieldLabel>
                          <Input
                            id="pvp-relay-secret"
                            type="password"
                            autoComplete="off"
                            value={settings.privatePvpRelaySecret}
                            placeholder="Generate or paste the shared relay secret"
                            onChange={(event) =>
                              setSetting("privatePvpRelaySecret", event.target.value)
                            }
                            disabled={listenerLocked}
                          />
                        </Field>
                        {settings.privatePvpMode === "host" && (
                          <Field>
                            <FieldLabel htmlFor="pvp-relay-host-id">
                              Host relay ID
                            </FieldLabel>
                            <Input
                              id="pvp-relay-host-id"
                              value={settings.privatePvpRelayHostId}
                              placeholder="Generated per host launcher"
                              onChange={(event) =>
                                setSetting("privatePvpRelayHostId", event.target.value)
                              }
                              disabled={listenerLocked}
                            />
                          </Field>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="lg"
                            disabled={!!busyAction || listenerLocked}
                            onClick={() => void runAction("generate-relay-credentials")}
                          >
                            <Spinner
                              hidden={busyAction !== "generate-relay-credentials"}
                            />{" "}
                            Generate credentials
                          </Button>
                          <Button
                            size="lg"
                            variant="secondary"
                            disabled={!settings.privatePvpRelayUrl || !!busyAction}
                            onClick={() => void runAction("test-relay")}
                          >
                            <Spinner hidden={busyAction !== "test-relay"} /> Test
                            relay
                          </Button>
                        </div>
                      </>
                    )}
                    {settings.privatePvpMode === "legacy-host" && (
                      <Field>
                        <FieldLabel htmlFor="pvp-public-host">
                          LAN or private-VPN guest address
                        </FieldLabel>
                        <Input
                          id="pvp-public-host"
                          value={settings.privatePvpPublicHost}
                          placeholder="100.64.0.10"
                          onChange={(event) =>
                            setSetting("privatePvpPublicHost", event.target.value)
                          }
                          disabled={listenerLocked}
                        />
                      </Field>
                    )}
                    {settings.privatePvpMode === "legacy-join" && (
                      <Field>
                        <FieldLabel htmlFor="pvp-host-url">
                          LAN or private-VPN host URL
                        </FieldLabel>
                        <Input
                          id="pvp-host-url"
                          type="url"
                          value={settings.privatePvpHostUrl}
                          placeholder="http://100.64.0.10:8088"
                          onChange={(event) =>
                            setSetting("privatePvpHostUrl", event.target.value)
                          }
                          disabled={listenerLocked}
                        />
                      </Field>
                    )}
                  </FieldGroup>
                  <FieldDescription>
                    {relayPvpMode &&
                      "Relay mode keeps ports 22000/8088 loopback-only and carries both players over outbound encrypted connections."}
                    {legacyPvpMode &&
                      "Legacy P2P directly exposes the host's TCP 22000 and HTTP 8088 listeners. Use it only on a trusted LAN or private VPN. Never port-forward these ports to the public internet."}
                    {settings.privatePvpMode === "off" &&
                      "Choose the encrypted relay for internet play, or Legacy P2P only for a trusted LAN or private VPN."}
                  </FieldDescription>
                </FieldSet>

                <FieldSet>
                  <FieldLegend>One-click relay server setup</FieldLegend>
                  <FieldDescription>
                    Deploys the bundled relay to an Ubuntu/Debian VPS through
                    SSH, installs a locked-down systemd service, starts it, and
                    verifies its HTTPS health endpoint.
                  </FieldDescription>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="relay-ssh-host">SSH host</FieldLabel>
                      <Input
                        id="relay-ssh-host"
                        value={settings.relaySshHost}
                        placeholder="203.0.113.10"
                        onChange={(event) =>
                          setSetting("relaySshHost", event.target.value)
                        }
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel htmlFor="relay-ssh-port">
                          SSH port
                        </FieldLabel>
                        <Input
                          id="relay-ssh-port"
                          type="number"
                          min={1}
                          max={65535}
                          value={settings.relaySshPort}
                          onChange={(event) =>
                            setSetting("relaySshPort", Number(event.target.value))
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="relay-ssh-user">
                          SSH user
                        </FieldLabel>
                        <Input
                          id="relay-ssh-user"
                          value={settings.relaySshUser}
                          placeholder="deploy"
                          onChange={(event) =>
                            setSetting("relaySshUser", event.target.value)
                          }
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>SSH private key</FieldLabel>
                      <div className="flex gap-2">
                        <Input value={settings.relaySshKeyPath} readOnly />
                        <Button
                          variant="secondary"
                          onClick={() =>
                            void browseRelayFile(
                              "relaySshKeyPath",
                              "Select SSH private key",
                            )
                          }
                        >
                          Browse
                        </Button>
                      </div>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="relay-ssh-host-key">
                        SSH host-key fingerprint
                      </FieldLabel>
                      <Input
                        id="relay-ssh-host-key"
                        value={settings.relaySshHostKeyFingerprint}
                        placeholder="SHA256:..."
                        onChange={(event) =>
                          setSetting(
                            "relaySshHostKeyFingerprint",
                            event.target.value,
                          )
                        }
                      />
                      <FieldDescription>
                        Copy this from the VPS provider console using ssh-keygen
                        -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256.
                      </FieldDescription>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel htmlFor="relay-hostname">
                          Public relay hostname
                        </FieldLabel>
                        <Input
                          id="relay-hostname"
                          value={settings.relayHostname}
                          placeholder="relay.example.com"
                          onChange={(event) =>
                            setSetting("relayHostname", event.target.value)
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="relay-port">
                          Relay HTTPS port
                        </FieldLabel>
                        <Input
                          id="relay-port"
                          type="number"
                          min={1}
                          max={65535}
                          value={settings.relayPort}
                          onChange={(event) =>
                            setSetting("relayPort", Number(event.target.value))
                          }
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>TLS certificate (PEM)</FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          value={settings.relayTlsCertificatePath}
                          readOnly
                        />
                        <Button
                          variant="secondary"
                          onClick={() =>
                            void browseRelayFile(
                              "relayTlsCertificatePath",
                              "Select relay TLS certificate",
                            )
                          }
                        >
                          Browse
                        </Button>
                      </div>
                    </Field>
                    <Field>
                      <FieldLabel>TLS private key (PEM)</FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          value={settings.relayTlsPrivateKeyPath}
                          readOnly
                        />
                        <Button
                          variant="secondary"
                          onClick={() =>
                            void browseRelayFile(
                              "relayTlsPrivateKeyPath",
                              "Select relay TLS private key",
                            )
                          }
                        >
                          Browse
                        </Button>
                      </div>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="relay-install-path">
                        VPS install path
                      </FieldLabel>
                      <Input
                        id="relay-install-path"
                        value={settings.relayInstallPath}
                        onChange={(event) =>
                          setSetting("relayInstallPath", event.target.value)
                        }
                      />
                    </Field>
                    <Button
                      size="lg"
                      disabled={!!busyAction}
                      onClick={() => void runAction("deploy-relay")}
                    >
                      <Spinner hidden={busyAction !== "deploy-relay"} /> Deploy,
                      start, and verify relay
                    </Button>
                  </FieldGroup>
                  <FieldDescription>
                    The SSH account must use key authentication and be root or
                    have passwordless sudo. DNS must already point to the VPS, the certificate
                    must cover that hostname, and inbound TCP 443 (or the chosen
                    relay port) must be open. SSH credentials and TLS private
                    keys are never shared with players.
                  </FieldDescription>
                </FieldSet>
              </FieldSetGroup>
            </TabsContent>
            <TabsContent value="advanced">
              <FieldSetGroup>
                <FieldSet>
                  <FieldLegend>Server time</FieldLegend>
                  <Field>
                    <Input
                      type="datetime-local"
                      value={serverTime}
                      onChange={(event) => setServerTime(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        disabled={!!busyAction}
                        onClick={() =>
                          void runAction("set-server-time", {
                            iso: new Date(serverTime).toISOString(),
                          })
                        }
                      >
                        <Spinner hidden={busyAction !== "set-server-time"} />{" "}
                        Set Time
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        disabled={!!busyAction}
                        onClick={() => void runAction("clear-server-time")}
                      >
                        Clear
                      </Button>
                    </div>
                  </Field>
                </FieldSet>
                <FieldSet>
                  <FieldLegend>Installed data</FieldLegend>
                  <FieldDescription>
                    {snapshot?.gameplay.description ??
                      "Checking gameplay assets..."}
                  </FieldDescription>
                  <Field>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="lg"
                        disabled={!!busyAction}
                        onClick={() => void runAction("verify-assets")}
                      >
                        <Spinner hidden={busyAction !== "verify-assets"} />{" "}
                        Verify Assets
                      </Button>
                      <Button
                        size="lg"
                        disabled={!!busyAction}
                        onClick={() => void runAction("build-cache")}
                      >
                        <Spinner hidden={busyAction !== "build-cache"} /> Build
                        Cache
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        disabled={!!busyAction}
                        onClick={() => void runAction("refresh-wiki-cache")}
                      >
                        Rebuild Wiki Images
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        disabled={!!busyAction}
                        onClick={() => void runAction("refresh-cutscene-cache")}
                      >
                        Refresh Backgrounds
                      </Button>
                    </div>
                  </Field>
                </FieldSet>
                <FieldSet>
                  <FieldLegend>Dependencies</FieldLegend>
                  <FieldGroup className="gap-2">
                    {Object.entries(snapshot?.dependencies ?? {}).map(
                      ([name, dependency]) => (
                        <div
                          key={name}
                          className="grid grid-cols-[7rem_5rem_1fr] gap-2 text-xs"
                        >
                          <span className="uppercase tracking-wide">
                            {name}
                          </span>
                          <span
                            className={
                              dependency.available
                                ? "text-green-400"
                                : "text-destructive"
                            }
                          >
                            {dependency.available ? "Ready" : "Missing"}
                          </span>
                          <span
                            className="text-muted-foreground truncate"
                            title={dependency.path}
                          >
                            {dependency.path}
                          </span>
                        </div>
                      ),
                    )}
                  </FieldGroup>
                </FieldSet>
                <FieldSet>
                  <FieldLegend>Environment overrides</FieldLegend>
                  <FieldDescription>
                    One KEY=VALUE entry per line. These override listener
                    defaults.
                  </FieldDescription>
                  <Textarea
                    className="min-h-32 font-mono"
                    value={settings.advancedEnvironment}
                    onChange={(event) =>
                      setSetting("advancedEnvironment", event.target.value)
                    }
                    disabled={listenerLocked}
                  />
                </FieldSet>
                <FieldSet>
                  <FieldLegend>Launcher settings</FieldLegend>
                  <Field>
                    <div className="flex gap-2">
                      <Button size="lg" onClick={() => void saveSettings()}>
                        Save Settings
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => void reset()}
                      >
                        Reset Settings
                      </Button>
                    </div>
                    {lastError && (
                      <FieldDescription className="text-destructive">
                        {lastError}
                      </FieldDescription>
                    )}
                  </Field>
                </FieldSet>
              </FieldSetGroup>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
