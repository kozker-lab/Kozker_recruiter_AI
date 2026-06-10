# Kozker Recruiter AI Design System

## General Aesthetic
- **Vibe**: Sleek, enterprise-grade, data-dense, minimal, and fast.
- **Inspiration**: Linear, Ashby, Attio, Cursor.
- **Shape/Roundness**: Sharp corners (minimal rounding, `rounded-sm` or `rounded-none`, maximum `rounded-md` for standard buttons/inputs). No bubbly or pill-shaped containers.

## Typography
- **Headings**: `Inter Tight`, sans-serif
- **Body**: `Inter`, sans-serif
- **Monospace/Data**: `JetBrains Mono`, monospace

## Color Palette

### Primary Color (Reserved for CTA and highlights)
- Brand Orange: `#FF6E30`

### Success
- Success Green: `#16A34A`

### Warning
- Warning Amber: `#D97706`

### Error
- Error Red: `#DC2626`

### Info
- Info Blue: `#2563EB`

### Neutrals (Drives 90% of the UI)
- `#FFFFFF` (White background)
- `#FAFAF9` (Off-white background, subtle highlights)
- `#F4F4F3` (Borders, divider lines, muted text background)
- `#E7E5E4` (Inactive indicators, light borders)
- `#D6D3D1` (Muted placeholder text, disabled UI borders)
- `#A8A29E` (Muted labels, secondary descriptions)
- `#78716C` (Secondary text, inactive tabs)
- `#57534E` (Regular text body, labels)
- `#44403C` (Darker body text, active state)
- `#292524` (Subtle dark background/dark mode text, borders)
- `#1C1917` (Dark UI backgrounds, inputs, cards)
- `#0C0A09` (Pure background dark, deepest neutral)

## Interaction States
- **Hover**: Subtle shifting of backgrounds (e.g. `bg-neutral-50` to `bg-neutral-100` in light theme).
- **Active**: Primary brand orange border (`border-[#FF6E30]`) or solid background.
- **Focus**: High contrast ring outline, no offset.
