import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldSetGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLauncherState } from "@/components/providers/launcher-state-provider";
import { open } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { FolderOpenIcon } from "lucide-react";

interface PacketExportResult {
  packetPath: string;
  packet: { payloadSize: number; payloadSha256: string };
  source: { id: string };
  capture: string;
}

interface ProfileImportResult {
  imported: Record<string, unknown>;
  copyPath: string;
  source: { id: string };
  capture: string;
}

export const Save = () => {
  const {
    snapshot,
    settings,
    setSetting,
    services,
    busyAction,
    lastError,
    refresh,
    runAction,
    startService,
    stopService,
  } = useLauncherState();
  const [packetResult, setPacketResult] = useState<PacketExportResult | null>(null);
  const [importResult, setImportResult] = useState<ProfileImportResult | null>(null);
  const [finishing, setFinishing] = useState(false);
  const capture = services.capture;
  const captureBusy = capture.state === "starting" || capture.state === "stopping" || finishing;
  const captureDriverReady = snapshot?.dependencies.captureDriver?.available === true;

  const chooseCaptureFolder = async () => {
    const selected = await open({ title: "Cross Save capture folder", directory: true, multiple: false });
    if (typeof selected === "string") setSetting("capturePath", selected);
  };

  const finishAndExport = async () => {
    setFinishing(true);
    try {
      if (capture.state === "running") await stopService("capture");
      const next = await runAction<PacketExportResult>("export-cross-save");
      setPacketResult(next);
      await writeText(next.packetPath);
      await revealItemInDir(next.packetPath);
    } finally {
      setFinishing(false);
    }
  };

  const importProfile = async () => {
    const next = await runAction<ProfileImportResult>("extract-cross-save");
    setImportResult(next);
    await writeText(JSON.stringify(next.imported, null, 2));
  };

  return (
    <FieldSetGroup className="max-w-3xl h-200">
      <FieldSet>
        <FieldLegend>Capture official JOIN_LOBBY_ACK</FieldLegend>
        <FieldDescription>
          Start capture before opening the official client. After the lobby loads, finish and export one packet
          file. Treat it as private account data.
        </FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="capture-folder">Capture Folder</FieldLabel>
            <div className="flex gap-2">
              <Input id="capture-folder" value={settings.capturePath} placeholder="Default captures folder" readOnly />
              <Button
                variant="secondary"
                size="lg"
                onClick={chooseCaptureFolder}
                disabled={capture.state !== "stopped"}
              >
                Browse
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {capture.state === "running" ? (
                <Button size="lg" onClick={() => void finishAndExport()} disabled={captureBusy || !!busyAction}>
                  {finishing && <Spinner />}
                  <span>{finishing ? "Exporting..." : "Finish and Export"}</span>
                </Button>
              ) : (
                <Button size="lg" onClick={() => void startService("capture")} disabled={!captureDriverReady || captureBusy || !!busyAction}>
                  {capture.state === "starting" && <Spinner />}
                  <span>{capture.state === "starting" ? "Starting..." : "Start Capture"}</span>
                </Button>
              )}
              {capture.state === "stopped" && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => void finishAndExport()}
                  disabled={captureBusy || !!busyAction}
                >
                  Export Latest Packet
                </Button>
              )}
            </div>
            <FieldDescription>
              {capture.state === "running"
                ? `${capture.details}. Open the official client and wait until the lobby is fully loaded.`
                : captureDriverReady
                  ? "Bundled Wireshark tools and the Npcap capture driver are ready."
                  : "Npcap is required once for Windows packet capture; the Wireshark command-line tools are already bundled."}
            </FieldDescription>
            {!captureDriverReady && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="lg" onClick={() => openUrl("https://npcap.com/#download")}>
                  Install Npcap
                </Button>
                <Button variant="secondary" size="lg" onClick={() => void refresh()}>
                  Retry Check
                </Button>
              </div>
            )}
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend>Optional profile import</FieldLegend>
        <FieldDescription>
          Packet export does not need Assembly-CSharp.dll. Import uses the official source client selected on Home.
        </FieldDescription>
        <FieldGroup>
          <Field orientation="horizontal">
            <Switch
              id="switch-imported-save"
              checked={settings.switchToImportedSave}
              onCheckedChange={(checked) => setSetting("switchToImportedSave", checked)}
              disabled={!!busyAction}
            />
            <FieldLabel htmlFor="switch-imported-save">Switch to imported save</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch
              id="update-matching-import"
              checked={settings.updateMatchingImport}
              onCheckedChange={(checked) => setSetting("updateMatchingImport", checked)}
              disabled={!!busyAction}
            />
            <FieldLabel htmlFor="update-matching-import">Update matching official import</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch
              id="keep-uid"
              checked={settings.keepOfficialUid}
              onCheckedChange={(checked) => setSetting("keepOfficialUid", checked)}
              disabled={!!busyAction}
            />
            <FieldLabel htmlFor="keep-uid">Keep official UID</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch
              id="keep-fc"
              checked={settings.keepOfficialFriendCode}
              onCheckedChange={(checked) => setSetting("keepOfficialFriendCode", checked)}
              disabled={!!busyAction}
            />
            <FieldLabel htmlFor="keep-fc">Keep official friend code</FieldLabel>
          </Field>
          <Button size="lg" onClick={() => void importProfile()} disabled={capture.state !== "stopped" || !!busyAction || finishing}>
            <Spinner hidden={busyAction !== "extract-cross-save"} />
            <span>{busyAction === "extract-cross-save" ? "Importing..." : "Import Captured Profile"}</span>
          </Button>
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend>Result</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel>{packetResult ? `Packet exported from ${packetResult.source.id}` : "Idle"}</FieldLabel>
            <FieldDescription>
              {packetResult?.packetPath ?? lastError ?? "The packet export path will appear here."}
            </FieldDescription>
            {packetResult && (
              <Button variant="secondary" size="lg" onClick={() => revealItemInDir(packetResult.packetPath)}>
                <FolderOpenIcon /> Show JOIN_LOBBY_ACK file
              </Button>
            )}
          </Field>
          {importResult && (
            <Field>
              <FieldLabel>Imported profile</FieldLabel>
              <FieldDescription>{importResult.copyPath}</FieldDescription>
              <Textarea className="min-h-56 font-mono" value={JSON.stringify(importResult.imported, null, 2)} readOnly />
              <Button variant="secondary" size="lg" onClick={() => revealItemInDir(importResult.copyPath)}>
                <FolderOpenIcon /> Show exported users.json
              </Button>
            </Field>
          )}
        </FieldGroup>
      </FieldSet>
    </FieldSetGroup>
  );
};
