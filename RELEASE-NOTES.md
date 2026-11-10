# RELEASE NOTES

## `v0.1.3`

### In-app updates
- **Update same version:** added an **“Update same version”** action in **Settings → Updates** (shown when already up to date) to fetch and install the latest available build for the current platform even when the app version/tag is unchanged. This supports micro-deliveries where fixes are merged without a version bump.
- **Force-update backend:** added a Tauri command to perform a forced updater check (bypassing version comparison) so same-version builds can be offered and installed through the existing download/install/restart flow.

### Windows & app shell
- **Single titlebar on Windows:** removed the duplicate native Windows titlebar by using Windows-specific window configuration (decorations disabled), keeping only Folio’s custom titlebar design.
- **Customized title bar setting:** added **Customized Title Bar (Experimental)** in Settings. Turning it off restores the native window title bar and hides the Integrated Shell Bar option.
- **Window controls fix:** custom title bar minimize, maximize/restore, close, and drag/move now work on Windows (added the missing window permissions and switched to Tauri drag regions).
- **Window controls:** added custom minimize/maximize/restore/close controls in the titlebar for Windows/Linux (with maximize state tracking and drag-safe controls) while preserving macOS overlay/titlebar behavior.
- **Launch behavior:** app now opens **maximized by default** on startup.

### Deposits
- **Deposit number format:** deposit numbers now accept the `/` character (in addition to letters, numbers, hyphens, and underscores), including normalization and validation updates, to support formats used by some financial institutions.

### CI/CD, releases & macOS distribution
- **Release notes delivery fix:** GitHub Actions release workflow now always extracts release notes (no longer skipped on non-tag runs), resolves `RELEASE-NOTES.md` from reliable paths, and publishes notes to GitHub Releases/updater metadata.
- **Release notes output fix:** ensured multiline GitHub Actions output delimiters are written correctly (trailing newline before `EOF`) to prevent release-notes publishing failures.
- **Fallback:** if release notes cannot be found or extracted for the current version, the workflow defaults to **“Release notes not maintained”** so users still receive a clear message.
- **Release naming:** release name now uses the app version (e.g. `Folio v0.1.3`) instead of branch/ref names like `Folio main`.
- **Versioned releases:** the workflow now derives the tag and release from the app version (`v{version}`). A bumped version creates a new tag/release; re-running the same version replaces the existing release assets and notes.
- **macOS packaging:** macOS builds are now ad-hoc signed (`signingIdentity: "-"`) so the `.app` bundle has a valid sealed signature on Apple Silicon, fixing the “Folio is damaged and can’t be opened” Gatekeeper error. No Apple Developer signing/notarization is performed, so users may still need to allow the app in macOS Privacy & Security on first launch.

### Version & verification
- Bumped to **`0.1.3`** in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
- Recommended runtime verification in Tauri (Windows titlebar minimize/maximize/close/drag, Customized Title Bar toggle, macOS titlebar behavior, maximized launch, same-version update flow, deposit number `/` input, and release/updater notes delivery in CI artifacts). For macOS ad-hoc signed DMG builds, verify download/install/open flow and document the Privacy & Security allow step if needed.

## `v0.1.2`

### Dashboard & overview
- **Allocation graph customization:** per-item custom colors for allocation/overview categories (including deposit sub-items like FDs/RDs) via clickable color pickers on legend indicators; colors persist in app settings (`allocationColors`) and apply to the allocation bar, legend, and Data Overview.
- **Allocation bar interactions:** interactive distribution segments with hover and click/fixed tooltip showing **Category • Percentage** (with arrow, theme-aware styling), subtle color-tinted selection shadow/lift, and click-outside to clear focus.

### Settings & UI
- **Appearance → Allocation Overview:** added reset control to restore default allocation colors (reset icon, disabled when no custom colors are set, updated label/subtext). Moved **Experimental** tags to the left of **Integrated Shell Bar** and **Smart Tables** labels.
- **Filtered tables:** shared table headers now show a semantic warning asterisk next to the record count when filters are applied, with tooltip **“Records selected based on filter.”**

### In-app updates & releases
- **Release notes:** tagged release workflow extracts the matching version section from `RELEASE-NOTES.md` and publishes it as the GitHub Release/updater notes (instead of a placeholder), so `latest.json` includes changelog content.
- **Updates UI:** release notes in **Settings → Updates** render Markdown formatting (headings, lists, emphasis, code) and remain visible in the **ready to restart** state.

### Version & verification
- Bumped to **`0.1.2`** in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
- `cd folio && npm run typecheck` passes. Runtime smoke testing in Tauri (overview allocation customization/interactions, appearance reset, filtered table indicator, updater/release-notes flow, light/dark UI) recommended before tagging/release.

## `v0.1.1`

### In-app Updates
- Added GitHub Releases–based in-app updates via `tauri-plugin-updater` with signed updates and `latest.json` manifest support.
- Added **Settings → Updates** as a dedicated card (separate from About) with a guided flow: check for updates, download/install with progress, and restart to apply.
- Improved update UX: action button changes contextually (Check → Download & install → Restart), update status shown as alerts, and release notes shown in a collapsible “Release notes” section.
- Added updater plugins/capabilities, `createUpdaterArtifacts`, and release workflow support for signed updater publishing.

### Settings & UI
- Refreshed **About** layout to the previous compact style (logo, version/channel, credits) with the Updates experience moved to its own section.
- Polished update states and messaging (available/ready states use semantic alerts, centered/loading states improved).

### CI/CD & Releases
- Added build workflow permissions for release asset uploads (`contents: write`).
- Fixed Windows Rust/toolchain setup and shell quoting in CI; build **macOS `.dmg`** and **Windows NSIS `.exe`** only (no ZIP/MSI).
- Tagged/release workflow aligned to produce per-platform artifacts named `folio-{version}-{platform}-release`.
- Updated updater signing configuration and rotated updater public key as needed for release builds.

### Fixes
- Resolved duplicate declaration issues in About UI and layout regressions.

## `0.1.0`

### Deposits
- Enabled **Recurring Deposit (RD)** support across deposit types, form/wizard steps, details/table/stats, validation/config, export, services, and backup/schema handling.
- Added **Active** vs **Matured/Pre-closed** tabs with tab-scoped filters and category/stat interactions; **Add** hidden on Matured/Pre-closed.
- Matured/pre-closed deposits treated as **reference-only** (excluded from portfolio totals/calculations/stats app-wide, including dashboard finance aggregates).

### Dashboard & overview
- Net worth hero theme inversion (light/dark) with visibility fixes.
- Allocation progress/list shows **Deposits hierarchy** (Deposits → Fixed/Recurring/Other Deposits) with centralized colors; zero-wealth items hidden from overview.

### Financial Institutions
- Added **Branch** filter (after Operation Mode) using unique uppercased branch values with fuzzy matching/filtering; included in clear/export filters.

### Navigation & editing safety
- Universal **header back** button (tracked in-app history), disabled when no history; removed redundant page-level back buttons on FI/deposit detail/form headers (wizard/flow cancel behavior preserved).
- Unsaved-changes foundation: confirm prompt for unsaved edits, `beforeunload`, link/header-back interception, and draft stash/restore hooks; wired for header back and **Deposit form** (FI wizard/profile full wiring pending).

### Audit, data & exports
- `createdBy`/`changedBy` stored as **profile email** (cross-app portable); SQLite migration maps legacy profile UUID → email; profile email changes propagate across audited records.
- **Change Details** added to FI/Deposit detail views (shows resolved full name or email; never raw UUID). *Confirm export/PDF parity for new display fields as needed.*
- Responsive table/layout consistency: filters + right-aligned Clear Filters, header/title+count+actions, export busy indicator + filtered-export confirmation patterns, fixed/sticky column dark-mode background fixes, deposit tab styling cleanup.

### Theming & docs
- Centralized theme role tokens (`folio-role-*`) and dark-mode table CSS var fixes; PostCSS `@apply` role-text issue resolved.
- `AGENTS.md`: display-changes vs exports confirmation guideline; local path example anonymized.
- `README.md`: TODOs updated for RD enablement; build badge/link uses `<owner>/<repo>` placeholders (**restore your repo path before release**).

### Version & verification
- Bumped to **`0.1.0`** in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
- `cd folio && npm run typecheck` passes. Runtime smoke testing in Tauri (migrations, backup/restore, exports/PDF, auth, dark/light UI, navigation, unsaved-change flows) recommended before commit/tag.

## `v0.0.1`

### Initial release
- First packaged release of **Folio** (Tauri v2 + React + TypeScript + Vite), a local-first private wealth ledger (INR) with SQLite storage.
- Core modules: Dashboard, Financial Institutions, Deposits, Transactions/UPI, Profile/settings, backups/exports, and theming (light/dark).
- Desktop installer builds (DMG/NSIS) and baseline configuration for local-first data management.
