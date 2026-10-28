# Design: modlist.org

The locked system. Every Hallmark run reads this first and pages share it. Change it on purpose; the file is the rule. The desktop app (`modlist_org_app`) mirrors it in `lib/src/ui/theme.dart`.

## System
- Genre: modern-minimal
- Shape of the first page: Index (the mod index is the hero's visual); mod page: Counter (the download box is the action); signed-in pages are app screens
- Theme: brand, Overlayer V5 (overlayer-ui / overlayer_ui_flutter); never replaced by a dealt theme
- Axes: dark/geometric-sans/chromatic-violet · posture: Restrained

## Tokens
`app/assets/css/tokens.css` is the source of truth; `main.css` aliases the project names (`--bg`, `--surface`, `--text`, `--accent`…) onto it. The roles:
```css
:root {
  --color-paper: oklch(18.2% 0.014 291);  --color-paper-2: oklch(23.4% 0.023 292);  --color-paper-3: oklch(28.5% 0.026 291);
  --color-control: oklch(35.7% 0.029 290);  --color-field-edge: oklch(56% 0.04 289);
  --color-ink: oklch(97% 0.015 282);  --color-ink-2: oklch(77.1% 0.028 288);  --color-muted: oklch(64.8% 0.04 289);  --color-rule: oklch(27% 0.02 291);
  --color-accent: oklch(72.2% 0.146 278);  --color-accent-fill: oklch(63.3% 0.198 275);  --color-accent-ink: oklch(16% 0.02 280);  --color-focus: oklch(74% 0.19 278);
  --font-display: "SUIT", "Noto Sans SC", ui-sans-serif, system-ui, sans-serif;  --font-body: same;  --font-outlier: ui-monospace (code only);
  --radius-sm: 8px;  --radius-card: 12px;  --radius-pill: 999px;  --rule-hair: 1px;  --shadow-card: 0 1px 2px var(--color-shadow);
}
```
The spacing scale (4px steps), the type scale, the easings and the durations are the scaffold's and live in `tokens.css`.

## Composition
- Lists of mods are index rows parted by hairlines (logo 72px, name, authors, one-line summary, tags; downloads large and version beneath in a right column), never a card grid.
- Figures that compare sit large in tabular numerals, parted by vertical hairlines, no icons.
- Main content sits on the page; cards (`--surface`, no border) only for sidebars, the download box and forms. Never a card inside a card.
- Heads: one weight (800), one colour; counts beside a head take the head's colour.

## Controls
- Primary: `--color-accent-fill` with `--color-accent-ink` text · 8px radius · 40px (app UI), 52px for the download action
- Secondary: `--color-control` fill, 2px inset accent ring on hover · same radius and height
- Fields: control fill, 1px `--color-field-edge`; focus is a 2px `--color-focus` outline, instant
- overlayer-ui controls (dropdown, toggle, button) are kept as the library draws them

## Motion
- Character: brisk; `--dur-micro` for hover and press, `--dur-short` for menus; no reveals, no overshoot, the spinner is the only loop; under reduced motion everything ends at once.

## Exports
`app/assets/css/tokens.css` here; `AppColors` / `AppRadius` in `modlist_org_app/lib/src/ui/theme.dart` for Flutter. Tailwind, DTCG or shadcn blocks are added here on request.
