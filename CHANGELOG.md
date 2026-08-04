# Developer Changelog

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
