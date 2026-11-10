<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/folio-horizontal-inverse.svg">
  <source media="(prefers-color-scheme: light)" srcset="public/folio-horizontal-color.svg">
  <img src="public/folio-horizontal-color.svg" width="300" alt="Folio Logo">
</picture>

**A simple, private place to keep track of what you own and owe — on your own device.**

[![Build installers](https://github.com/kirankalpathy/folio/actions/workflows/build-installers.yml/badge.svg)](https://github.com/kirankalpathy/folio/actions/workflows/build-installers.yml)

---

## What is Folio?

**Folio** is a local-first personal finance desktop app that helps you see your finances in one place. It's designed especially for people in India and works in **INR**. Your information is stored on **your device** (a local ledger), so you can manage your records without needing a cloud account for everyday use.

### Why Folio?

- **One view of your finances** — see savings, deposits, and obligations together.
- **Private by default** — your data stays on your computer.
- **Clear and comfortable to use** — clean interface with light/dark themes.

### What you can track

- **Deposits** — Fixed Deposits (FD) and Recurring Deposits (RD), with maturity tracking, interest calculations, and lifecycle status.
- **Financial Institutions** — banks, issuers, wallets, and platforms connected to your records.
- **Other portfolio areas** — stocks, bonds, PF/PPF, commodities, and debts (available in the app).

---

## Download & Install

### macOS

1. Download the `.dmg` file from the [latest release](https://github.com/kirankalpathy/folio/releases).
2. Open the `.dmg` and drag **Folio** into your **Applications** folder.
3. **First launch (one-time):** macOS may show a warning saying Folio is from an "unidentified developer" or "cannot be opened." This is normal for apps not signed through Apple's paid developer program. To allow it:
   - Open **System Settings → Privacy & Security**.
   - Scroll down to the **Security** section. You should see a message like *"Folio was blocked from use because it is not from an identified developer."*
   - Click **Open Anyway** (you may need to enter your Mac password).
   - The next time you open Folio, it will launch normally without any warning.
4. Folio is now ready to use. Subsequent updates will be installed automatically through the in-app updater.

> **Note:** This Privacy & Security step is a **one-time activity**. After the first launch, Folio opens normally. Future updates are delivered and installed directly within the app (Settings → Updates), so you won't need to repeat this process.

### Windows

1. Download the `.exe` installer from the [latest release](https://github.com/kirankalpathy/folio/releases).
2. Run the installer and follow the on-screen steps.
3. If Windows SmartScreen shows a warning, click **More info → Run anyway**.
4. Folio is installed and ready to use. Subsequent updates will be installed automatically through the in-app updater.

> **Note:** Like macOS, the SmartScreen warning is a **one-time activity**. Future updates are delivered in-app.

### After installation

- Open Folio from your Applications (macOS) or Start Menu (Windows).
- On first launch, you'll be guided to set up your profile (name, email, and optional passcode).
- Your data is stored locally on your device — no cloud account needed.

---

## How to Use Folio

### Everyday tasks

- **Add an account:** go to *Financial Institutions* → use the guided form to add a bank, wallet, issuer, or platform.
- **Track a deposit:** open *Deposits* → create a new deposit → follow the 4-step wizard.
- **Export deposits:** in the *Deposits* list, use the export option to save your list as **Excel, CSV, or PDF**.
- **Back up your data:** open *Settings → Backup & Restore* → create a local backup file.
- **Restore from a backup:** in *Settings → Backup & Restore*, choose a backup file to restore (review prompts carefully).
- **Adjust appearance or formats:** open *Settings* to change theme, header display, and number/date formats.

### Key features

- **Deposits** — create, view, and edit deposits with step-by-step validation (unique deposit numbers, amount/rate/date rules, pre-closure dates). Track lifecycle status: Planned, Active, Matured, Pre-closed, In Lien.
- **Financial Institutions** — add and manage banks, issuers, wallets, and platforms. Safety check before deletion (can't delete if linked to deposits).
- **Profile & Security** — set up a profile with photo, name, email, phone. Optional passcode protection with recovery via Passkey file.
- **Settings** — appearance (Light/Dark/System theme), regional formatting (number/date formats), backup & restore, danger zone (clear data/delete ledger), and about/version info.
- **Export** — export deposits and financial institutions as Excel, CSV, or PDF.

### To-do

Folio has several planned features and improvements. Detailed implementation plans are available in the local `plans/` folder (not committed to the repository).

**Rating legend:** Value ⭐ = Low, ⭐⭐⭐ = Medium, ⭐⭐⭐⭐⭐ = High | Priority ⭐ = Low, ⭐⭐⭐ = Medium, ⭐⭐⭐⭐⭐ = High | Complexity ⭐ = Low, ⭐⭐⭐ = Medium, ⭐⭐⭐⭐⭐ = High

**Sort order:** Items are sorted by Value (highest first), then Priority (highest first), then Complexity (lowest first).

| Feature / Implementation | Description | Value | Priority | Complexity |
|---|---|---|---|---|
| Data Import, Selective Backup & Restore | Modify vs Reload restore modes, template import, mass maintenance, selective backup/restore, bulk operations | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Automated Testing Strategy | Unit, integration, and E2E tests with Vitest and Playwright | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |
| Backup Encryption (E2E) | End-to-end encryption of backup files using password-based AES-256-GCM | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| Production-Grade Standards | Error boundaries, structured logging, performance optimization, accessibility, security hardening | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| Backup & Restore Schema Analysis | Identify and remove stray/redundant fields (e.g., bankName vs financialInstitutionId); classify computed vs manual fields | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Asynchronous Update Checking | Non-blocking update check/download with background sync, progress tracking, and manual restart | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Standardized File Name Format | Consistent `Folio_{Type}_{Date}.{format}` naming across all exports (currently uses timestamps) | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| Notification Framework | App-wide non-blocking toast/notification system for async events | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Multi-Profile Support | Multiple user profiles for family/household financial management with data isolation | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Configuration-Driven Architecture | Extract hardcoded values into centralized config; reduce technical debt | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| Deposit account types (Tax Saving, Other) | Implement remaining account types (Fixed Deposit and Recurring Deposit already available) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| Adjustable Column Widths | Drag-to-resize table columns with persisted width preferences | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Hardcoded Colors Cleanup | Replace remaining hardcoded hex/rgb colors with CSS variables and semantic tokens | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| UPI QR Generator | Generate a UPI payment QR code by entering a UPI address or mobile number, along with amount, payee name, and a note | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Data Migration Strategy | Formal SQLite schema migration framework with version tracking and rollback | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

### Keeping your data safe

- Your data is stored **locally** on your device. No cloud sync.
- Create regular backups via *Settings → Backup & Restore*.
- Store backup files in a safe location (e.g., external drive or cloud storage of your choice).
- If you forget your passcode, use the **Passkey file** you saved during setup to recover access.

---

## Updates

Folio includes a built-in updater:

1. Open **Settings → Updates**.
2. Click **Check for updates**.
3. If an update is available, click **Download & install**, then **Restart** when prompted.

Updates are delivered automatically — you don't need to download new installers from GitHub after the first installation.

---

## For Developers

### Prerequisites

- **Node.js** — recent version
- **Rust toolchain** (stable) — install from [rustup.rs](https://rustup.rs/)
- **Platform build tools:**
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`)
  - **Windows:** Visual Studio C++ Build Tools + WebView2 Runtime

### Get started

```bash
npm install
npm run tauri:dev
```

### Build

```bash
npm run typecheck
npm run build
npm run tauri:build
```

Build outputs go to `src-tauri/target/release/bundle/`.

### Run checks

```bash
npm run typecheck
npm run build
```

### Project structure

- `src/pages/` — route-level screens
- `src/components/` — UI components by domain
- `src/services/` — data access and business logic
- `src/utils/` — pure helpers (finance, dates, validation)
- `src/theme/` — theming and design tokens
- `src/i18n/` — localization

### Contributing

1. Create a branch for your change.
2. Make focused updates and keep wording clear and user-friendly.
3. Run `npm run typecheck` and `npm run build` before opening a pull request.
4. Open a pull request describing what changed and why.

### License

This project is open source and licensed under the **[MIT License](./LICENSE)**. See the `LICENSE` file for details.