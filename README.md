<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/folio-horizontal-inverse.svg">
  <source media="(prefers-color-scheme: light)" srcset="public/folio-horizontal-color.svg">
  <img src="public/folio-horizontal-color.svg" width="300" alt="Folio Logo">
</picture>


**A simple, private place to keep track of what you own and owe — on your own device.**

[![Build installers](https://github.com/kirankalpathy/folio/actions/workflows/build-installers.yml/badge.svg)](https://github.com/kirankalpathy/folio/actions/workflows/build-installers.yml)

## Table of Contents

- [Project Description](#project-description)
- [Installation & Setup](#installation--setup)
- [Usage Examples](#usage-examples)
- [Modules / What’s inside](#modules--whats-inside)
- [To-do](#to-do)
- [Contributing & License](#contributing--license)

## Project Description

**Folio** is a local-first personal finance desktop app that helps you see your finances in one place. It’s designed especially for people in India and works in **INR**. Your information is stored on **your device** (a local ledger), so you can manage your records without needing a cloud account for everyday use.

### Why Folio?

- **One view of your finances** — keep an eye on savings, deposits, and obligations together.
- **Private by default** — your data stays on your computer.
- **Clear and comfortable to use** — a clean interface with light/dark themes and straightforward language.

### How it’s built (high level)

Folio is a desktop app built with modern web technologies (React and TypeScript) and packaged as a desktop application using Tauri. You don’t need to know the technical details to use it — the sections below focus on what you can do in the app.

## Installation & Setup

### Before you start (prerequisites)

- **Node.js** — a recent version installed on your computer.
- **Rust toolchain** (stable) — required to run or build the Folio desktop app (Tauri uses Rust behind the scenes).
  - Install from [rustup.rs](https://rustup.rs/), then restart your terminal.
- **Platform build tools** (for `tauri:build` / installers):
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Visual Studio C++ Build Tools (Desktop development with C++) and WebView2 Runtime (usually present on Windows 10/11)

Tauri prerequisites: https://v2.tauri.app/start/prerequisites/

### Get the app running locally

Open a terminal in the project folder (`folio/`) and run:

```bash
npm install
npm run tauri:dev
```

- `npm install` downloads the app’s dependencies.
- `npm run tauri:dev` starts the Folio desktop app in development mode.

### Build the app (frontend)

To create a production build of the frontend:

```bash
npm run typecheck
npm run build
```

### Build desktop installers (Tauri)

Builds are **platform-native**: build macOS installers on macOS, and Windows installers on Windows.

```bash
npm install
npm run typecheck
npm run tauri:build
```

`tauri:build` runs the frontend build and produces bundled artifacts under:

```text
folio/src-tauri/target/release/bundle/
```

Typical outputs:
- **macOS**: `bundle/dmg/*.dmg` and/or `bundle/macos/Folio.app`
- **Windows**: `bundle/msi/*.msi` and/or `bundle/nsis/*-setup.exe` (depending on available targets/tooling)

**Notes:**
- **Windows `.msi` cannot be generated on macOS** with the standard Tauri setup. To produce Windows installers, build on a Windows machine/VM or use CI (e.g., GitHub Actions with `windows-latest` and `macos-latest` runners). Tauri pipelines: https://v2.tauri.app/distribute/pipelines/github/
- **macOS Gatekeeper**: unsigned/unnotarized builds may show warnings for other users. For early/front-runner testing they can right-click → **Open**; for smoother distribution use [macOS signing + notarization](https://v2.tauri.app/distribute/sign/macos/).
- **Windows SmartScreen**: unsigned installers may warn; for wider release use [Windows signing](https://v2.tauri.app/distribute/sign/windows/).
- Keep `version`/`identifier` aligned in `src-tauri/tauri.conf.json` (and related package metadata) before sharing builds.

## Usage Examples

### Start Folio on your computer

```bash
npm install
npm run tauri:dev
```

### Run a quick check (helpful for contributors)

```bash
npm run typecheck
```

### Build a desktop installer (current platform)

```bash
npm run tauri:build
```

Then check `src-tauri/target/release/bundle/` for the generated `.dmg` (macOS) or `.msi`/NSIS installer (Windows).

### Common things you’ll do inside the app

- **Add an account**: go to *Financial Institutions* and use the guided form to add a bank, wallet, issuer, or platform.
- **Track a deposit**: open *Deposits*, create a new deposit, and follow the 4-step wizard.
- **Export deposits**: in the *Deposits* list, use the export option to save your list as **Excel, CSV, or PDF**.
- **Back up your data**: open *Settings → Backup & Restore* and create a local backup file.
- **Restore from a backup**: in *Settings → Backup & Restore*, choose a backup file to restore (review prompts carefully).
- **Adjust appearance or formats**: open *Settings* to change theme, header ticker, and regional number/date formats.

## Modules / What’s inside

### Overview (Dashboard)

Your home screen for a quick financial snapshot:

- **Net worth summary** — see assets, liabilities, invested amount, and gains/returns.
- **Allocation view** — understand how your money is spread out.
- **Optional header ticker** — can show net worth and/or liabilities at the top (you can turn this on or off in Settings).
- **Current date context** — helps you read your overview in the right time frame.

### Deposits

A detailed area for tracking fixed and recurring-style deposits, with a guided **4-step form** (Overview, Deposit Details, Maturity Details, Additional Details).

What you can do:

- **Create, view, and edit deposits** with clear step-by-step validations (including unique deposit numbers, amount/rate/date rules, and pre-closure dates that can’t be in the future).
- **Choose account type** (currently Fixed Deposit; other account types are planned — see [To-do](#to-do)).
- **Set operation type** (Single, Joint, Either (or) Survivor, Former (or) Survivor) and add joint holders when applicable (up to 2), with share details and a clear primary-holder share summary.
- **Link a deposit to an eligible Financial Institution** (Savings/Current accounts) when relevant.
- **Track status** with clear lifecycle labels: Planned, Active, Matured, Pre-closed, and In Lien (shown with easy-to-read coloring).
- **Set mode of operation** (Online or Offline) and capture **PAN linked** / **tax exempt** details with helpful warnings where relevant.
- **Mark a lien** when needed, with a required reason.
- **Add nominees** (optional) — names must be unique, and when you use nominees, total share must add up to 100%. Folio can suggest nominees you’ve used before.
- **Handle maturity and rollover options**, plus pre-closure details (editing rules may depend on the deposit’s status).
- **Find and review deposits easily** with search, filters, and summary stats.
- **Export your deposits list** as **Excel, CSV, or PDF** from within the app.

### Financial Institutions (Accounts)

Manage the banks, issuers, wallets, and platforms connected to your records:

- **Add and manage institutions** using a guided **3-step form**, with filters (Search, Category, Operation Mode), stats, and **Excel/CSV/PDF export**.
- **Categories supported** include Savings Account, Current Account, Credit Card Issuer, Digital Wallet, and Investment & Brokerage Platform.
- **View details** for each institution (including UPI QR support where applicable).
- **Safety check before deletion** — an institution can’t be deleted if it’s linked to financial entries or deposits.

### Profile & Security

Control your identity and access on your device:

- **Profile details** — photo, name, email, and phone number (supports +91 / 10-digit handling).
- **Passcode protection** — set up a passcode and sign in with it.
- **Use without a passcode** (optional) — available with clear warnings so you understand the trade-off.
- **Change or remove your passcode** when needed.
- **Forgot passcode?** — recover access using a saved **Passkey file**.
- **Log off** to lock your session.

### Settings

Adjust how Folio looks and how your data is handled:

- **Appearance** — choose Light, Dark, or System theme, and toggle the header ticker.
- **Regional Formatting** — set number and date formats used across the app.
- **Backup & Restore** — create a local backup file and restore from a backup when needed.
- **Danger Zone** — clear data or delete your ledger, with safeguards to help prevent mistakes.
- **About** — see your app version and channel.

### Other portfolio areas

Folio’s navigation also includes areas for other parts of your portfolio (such as stocks, bonds, PF/PPF, commodities/assets, and debts/obligations). Depending on what you’ve added or restored, these areas help you keep related records organized alongside the fully featured modules above.

### Everyday experience

- Clean, readable screens
- Light and dark themes
- Local-first privacy (your data stays on your device)
- Clear in-app wording, with a foundation for multiple languages

## To-do

### Planned features

- **UPI QR Generator** — generate a UPI payment QR code by entering a UPI address or mobile number, along with amount, payee name, and a note, so you can quickly share or scan payment details.

### Upcoming improvements

- **Deposit account types** — implement additional account types incrementally (currently only Fixed Deposit is enabled): Recurring Deposit, Tax Saving Deposit, and Other.
- **Tables (resizable columns)** — add adjustable column widths in data tables (Deposits, Financial Institutions, and other tables). Users should be able to drag to increase a column’s width, with a minimum width equal to the column’s default/current width.
- **In-app updates (GitHub Releases)** — add an update mechanism that checks GitHub Releases for new versions and lets users download/install updates from within the app (Tauri updater; implementation plan stored locally under `plans/`, not committed).

## Contributing & License

### Contributing

Contributions are welcome. If you’d like to help:

1. Create a branch for your change.
2. Make focused updates and keep the app’s wording clear and user-friendly.
3. Run checks before opening a pull request:

   ```bash
   npm run typecheck
   npm run build
   ```

4. Open a pull request describing what changed and why.

If you’re planning a larger change, it’s a good idea to start with a short discussion or issue so everyone stays aligned.

### License

This project is open source and licensed under the **[MIT License](./LICENSE)**. See the `LICENSE` file for details.
