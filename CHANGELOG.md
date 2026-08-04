# Developer Changelog

## 0.4.0 - 2026-08-04

### Added

- Added the Mod:Side home, creator, loader, asset extraction flow, and independent service controls.
- Added launcher access to Asset:Side, Story:Side, Unit:Side, Combat:Side, and Spine 3.7 Studio.
- Added Cross Save capture/export/import, event login backgrounds, frozen-client controls, and service status notifications.

### Changed

- Open Mod:Side now lands on its home page and starts the required Mod:Side and Combat:Side services automatically.
- Mod Creator and Mod Loader can open without extracting the full client asset library; asset-backed workspace cards remain locked until extraction completes.
- Updated the Discord button to the RevivalSide community invite.
- Restored persistent settings, responsive scrolling, real progress reporting, and single-instance window focus.

### Fixed

- Fixed Open log files when the logs directory has not been created by a service yet.
- Fixed launcher action/schema regressions and hidden Windows process handling.
- Fixed frozen-client routing and managed service lifecycle handling.
- Prevented repeated client freezes when a frozen client is already installed.

## 0.4.0-beta.1 - 2026-08-04

### Added

- Added the Mod:Side launcher entry with disk-space validation, extraction confirmation, live progress, and automatic loader opening.
- Added Tauri action support for the parent RevivalSide backend's `prepare-modside-assets` and `extract-modside-assets` operations.
- Added single-instance handling that restores and focuses the existing launcher window.
- Added working documentation and Discord sidebar links.

### Changed

- Persisted settings by key, restored the selected game after settings load, and added explicit save and reset controls.
- Simplified launch progress rendering and corrected home-page scrolling behavior.
- Standardized clean builds on Corepack-managed pnpm.

### Fixed

- Restored the launcher action callbacks and schema validity after the v0.3.5 integration merge.
- Fixed the Windows hidden-process helper after the single-instance merge.

### Integration note

Mod:Side asset preparation is implemented by the surrounding RevivalSide payload. Release packaging must include a backend that provides both Mod:Side actions before enabling the launcher entry.
