# AGENTS.md — Folio Project Guidelines

This document summarizes the engineering and product conventions established for **Folio**. Any human or AI agent working in this repository should follow these rules to keep the codebase consistent, maintainable, and safe to evolve.

## 1. Project context

- **App**: Folio is a **local-first personal finance desktop app** (Tauri + React + TypeScript + Vite), focused on tracking assets/liabilities in INR with data stored on the user’s device.
- **Primary stack**: React 19, TypeScript (strict), Vite, Tauri 2, Ant Design, Tailwind CSS, Lucide icons, dayjs.
- **Native/storage**: Desktop app uses **native SQLite** via `@tauri-apps/plugin-sql` (Tauri-only runtime behavior). Use Tauri plugins for native capabilities (e.g., dialog/fs for backups/exports) where applicable.
- **Working directory**: project root is `folio/` (run commands from the `folio/` directory).

## 2. Core engineering principles

### DRY (Don’t Repeat Yourself)
- Reuse shared logic, types, utilities, and UI patterns instead of duplicating behavior.
- Extract common formatting/calculation/display logic into `src/utils/*`, services, hooks, or shared components.
- When you see repeated validation, mapping, or status/label logic, centralize it (while keeping domain boundaries clear).

### No dead code
- Do not leave unused components, files, exports, hooks, services, types, or dependencies.
- Remove legacy paths only when it is safe and intentional; if migration/compatibility code is required (e.g., data migration), keep it clearly scoped and documented in code/comments/commit context.
- Prefer fixing root causes over adding parallel “temporary” implementations.

### Modular, maintainable structure
- Keep responsibilities separated:
  - **`src/pages/`**: route-level composition.
  - **`src/components/`**: presentational/feature UI, grouped by domain.
  - **`src/hooks/`**: data access/state hooks.
  - **`src/services/`**: persistence/business operations (SQLite/Tauri/native integrations).
  - **`src/utils/`**: pure helpers (finance, dates, deposits, validation/schema helpers, etc.).
  - **`src/types/`**: shared domain types/interfaces.
  - **`src/i18n/`**: localization/messages/translation helpers.
  - **`src/config/`**: navigation and app-level configuration/metadata.
  - **`src/theme/`** and **`src/index.css`**: theming/design tokens.
- UI components should not access storage/native APIs directly; go through hooks/services.
- Keep files focused. As a guideline, keep `.tsx` components reasonably small and split complex screens/wizards into step/section components.

### Configurability over hardcoding
- Prefer named constants, shared config, theme tokens, and utilities over magic numbers/strings.
- Validation limits, date bounds, status mappings, format options, feature toggles, and app-level labels/behavior should be easy to find and change.
- Reuse centralized formatters (`src/utils/finance.ts`, `src/utils/date.ts`) and settings-driven behavior where the app supports it.

## 3. TypeScript and code quality

- **Strict TypeScript**: follow the repo’s strict settings (`tsconfig.app.json` includes `strict`, `noUnusedLocals`, `noUnusedParameters`, etc.).
- **No `any`**. Use precise types, generics, unions, and `unknown` + narrowing when needed.
- **Enums for fixed value sets**: wherever a field has a known list of values (e.g., interest payout options/modes, deposit account types, operation types, statuses, frequencies, categories), define and use an **enum/enum-like constant** instead of scattering raw string literals. Prefer **JSON/SQLite-safe** patterns: TypeScript **string enums** or `as const` objects with a derived union type (e.g., `export const Foo = { Bar: 'bar' } as const; export type Foo = (typeof Foo)[keyof typeof Foo];`) so values serialize cleanly, comparisons stay type-safe, and adding a new value is centralized. Reuse the same enum/constants in types, validation, UI options, i18n key maps, backup schema, normalization, and calculations.
- Prefer type-safe domain modeling (e.g., lifecycle/status unions, typed IDs/inputs, discriminated patterns where helpful).
- Keep imports/exports clean; avoid unused symbols (the compiler/config enforces this).
- **Quality gate**: run `npm run typecheck` after meaningful changes.

## 4. UI/UX and design system conventions

- **Consistent patterns**: match existing layout, naming, spacing, labels-above-values detail views, and wizard/list/detail patterns.
- **Wizards (step validation)**: validate the fields in the **current step before moving to the next step**. Do not defer validation to the final submit for fields that belong to earlier steps. Show validation messages **within the same step** and prevent progression until that step’s fields are valid.
- **Date pickers**: whenever a `DatePicker` (or date-entry field) is introduced, it **must follow the user-configured date format** (use the shared date format utilities/settings, e.g. `getDateFormatId()`/date helpers in `src/utils/date.ts`), not a hardcoded display format.
- **Theming**: support light/dark (and system where implemented) using existing theme providers/tokens.
- **Semantic colors**: use the semantic color system (CSS variables in `src/index.css`, Tailwind semantic mappings, and AntD theme alignment) for info/success/warning/error states (including status tags, alerts, and semantic surfaces). Do not introduce ad-hoc semantic colors when a semantic token exists.
- **No hardcoded colors**: do not hardcode colors (hex/rgb/hsl, named CSS colors, or arbitrary color values) in components, pages, utilities, or styles. Keep colors centralized in theme tokens/CSS variables (`src/index.css`), Tailwind theme/config mappings, and AntD theme configuration. Use existing semantic or brand tokens/classes; if a new color is truly needed, add it centrally first rather than inlining it.
- **Busy indicator (global blocking)**: use the shared `BusyIndicator` (`BusyIndicatorProvider` / `useBusyIndicator().setBusyIndicator`) for operations that must block the UI until complete (e.g., backup/restore). **Important:** whenever `setBusyIndicator()` / `setBusyIndicator(true)` is called, the **same method/function must always call `setBusyIndicator(false)`** when the operation completes (use `try/finally`). Never leave the busy indicator active after the action finishes, or the app will remain stuck/spinning.
- **Responsive layout / no forced scrollbars**: UI elements and sections (including combined split views like Settings left/right panes) must be **responsive**. Do not introduce fixed heights/min-heights or rigid sizing that force internal scrollbars when viewport/content size changes; layouts should adapt naturally and let scrolling occur only at the appropriate page/container level when truly necessary.
- **Accessibility/interaction**: follow established UX rules (e.g., global text selection limited to editable/text-entry contexts; consistent focus/contrast; clear validation messages).
- **Icons and components**: use existing libraries/patterns (Lucide icons, AntD components) consistently. Lucide icons inherit the global stroke weight from `--folio-icon-stroke-width` in `src/index.css`; do not set per-icon `strokeWidth` unless a documented exception is needed.

## 5. Internationalization (i18n)

- User-facing text should use **i18n** (`t()` in React via `useI18n`, `translate()` in non-React/service contexts as appropriate).
- Do not hardcode user-facing labels, placeholders, validation messages, toasts, titles, button text, or accessibility labels when they belong in i18n.
- Add keys to `src/i18n/messages/en.ts` (and keep key naming structured by domain: `common.*`, `deposit.*`, `institutions.*`, `settings.*`, `errors.*`, etc.).
- **Avoid i18n duplication**: before adding a new key, check for an existing key with the same meaning. Reuse shared keys when semantics truly match; if multiple keys have identical/similar text, prefer consolidating or propose a clear generalization (especially for `common.*` patterns).
- Keep copy clear, consistent, and user-friendly.

## 6. Data, domain, and business rules

- Preserve established domain behavior unless the change request explicitly updates it.
- **Deposits** (key conventions implemented): wizard-based create/edit, read-only detail view, ID-based linkage to Financial Institutions (`financialInstitutionId`), lifecycle/status rules (including lien/pre-closure behavior), validations (e.g., required fields, principal/rate/date constraints, nominee rules), and export/backup compatibility considerations.
- **Portfolio calculations (matured & pre-closed deposits)**: deposits with status **Matured** or **Pre-closed** are **reference-only data points**. They must **not** be considered in principal, current value, gains, weighted averages, counts, stat cards, summaries, or any other portfolio/financial calculations **across the application**. Only planned, active, and in-lien deposits count toward portfolio totals; matured/pre-closed remain viewable in their dedicated deposits view/tab and exports where appropriate.
- **Financial Institutions**: category-specific fields/validation, migration/normalization for legacy data where present, and safeguards (e.g., prevent deletion when linked records exist).
- **Backups/restore/exports**: use Tauri dialog/fs flows where applicable; keep data portable and schema-compatible; handle cancel/no-op cases gracefully.
- **Display changes vs. exports (check with user)**: whenever a **display/detail view** changes and an **export option is enabled** for that area, **check with the user** whether the display changes should apply to exports (**especially PDF**). Adding/removing fields or changing layout may impact export output (columns, sections, formatting, field availability) in some cases—confirm before assuming parity.
- When changing stored data shape, consider **backward compatibility**, normalization, migration, backup schema validation, and UI/export impacts.
- **Schema/backup discipline**: whenever fields/record structure change for persisted domain data, **update the backup schema validation** (`src/utils/backupSchema.ts` and related types/rules) and **update backup/restore engines** (`src/services/backup.ts` and any normalization/migration paths) accordingly. **Ensure backup/restore functionality is not broken** (validate end-to-end behavior for affected data). Keep legacy backups restorable where practical (optional/tolerant validation, safe defaults/normalization).

## 7. Testing/verification and change discipline

- Run `npm run typecheck` for TypeScript changes.
- Rust/Tauri native runtime verification (`npm run tauri:dev` / `npm run tauri:build`) may require a local Rust toolchain; if unavailable, state what was not verified.
- Make minimal, targeted changes that fit existing patterns.
- Do not introduce secrets, destructive behavior, or hidden data loss. For risky operations (clear/delete/restore/overwrite), follow existing confirmation/safeguard patterns.
- Update documentation (`README.md`, and this file when conventions evolve) when behavior or workflows change.

## 8. When unsure

- Inspect existing implementations before adding new patterns.
- Prefer consistency with the current codebase over novel abstractions.
- If a rule conflicts with a new product requirement, implement the requirement clearly and update this `AGENTS.md` to reflect the new decision.

## 9. Git and version control (manual-only)

- **Never use any git commands** such as `git commit`, `git add`, staging files, pushing to GitHub/remotes, creating tags/releases, or any other VCS-mutating git operations.
- These are **strictly manual actions**. No agent is allowed to perform them, **even if the user explicitly commands it**.
- You may only **guide the user** in performing the necessary actions (explain what to run, suggest commit messages, list affected files/steps), but execution is **STRICTLY manual** by the user.
- Read-only inspection commands (e.g., `git status`, `git diff`, `git log`, `git show`) may be used when needed to understand the working tree or provide guidance, but never to modify repository state.

## 10. Versioning, build numbers, and release notes

- **Version bump → release notes**: whenever the app `version` is bumped (in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `Cargo.lock`), update `RELEASE-NOTES.md` with the notes for that version in the same change.
- **Release notes format**: release notes must be **non-technical and end-user friendly**. Write them from the user's perspective, avoiding implementation details, internal file names, or developer jargon. Whenever a change is made, update `RELEASE-NOTES.md` **before completing the task**. Entries must be added **chronologically with the latest features first** within each section.
- **Internal build number**: Folio keeps a build number in the top-level `build` field of `package.json` using the format `<yymmdd>.<increment>` (for example `261110.0`). It is independent of Git tags, GitHub Actions, and GitHub releases; it exists so builds of the same app version can be distinguished inside the app.
- **Same-version commits/releases**: before committing or publishing another build with the same app `version`, increment the build number with `npm run build:bump` and include the updated `package.json`. The script increments the suffix on the same calendar day and resets it to `.0` on a new day.
- The current build number is shown in **Settings → About**, immediately after the version.
