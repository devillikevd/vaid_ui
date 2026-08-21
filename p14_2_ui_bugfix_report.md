# Phase P14.2: Diagnostic Center UI State Bug Fix

## 1. Root Cause of Double KPI Border (Bug 1)
The `<KPICard>` component had stacking styles for the active state that caused a double border effect. It explicitly used `border` in the global class string along with Tailwind's `ring-2 ring-offset-1` appended conditionally. Additionally, it forced an inline `style={{ borderColor: 'currentColor' }}` override. 
When all combined, this drew the physical 1px border alongside a 2px pseudo-border ring, resulting in a misaligned double line.

**Fix Applied:**
Removed the `ring-2`, `ring-offset-1`, and the inline `style` override. Refactored the `colorMap` so the normal state explicitly uses `border` and the active state natively maps to `border-2` (which overrides `border`), accompanied by an upgraded `border-{color}-500` tailwind token. This cleanly renders a perfect 2px accent border without stacking or layout shift.

## 2. Root Cause of Multiple Sidebar Active States (Bug 2)
The `DashboardLayout.tsx` logic dynamically evaluates `basePath` by extracting the role using `const basePath = \`/${baseRoleStr?.replace(/_owner|_manager/, '')}\`;`. 
For a `diagnostic_center_owner`, this mapped strictly to `/diagnostic_center` (with an underscore). However, the navigation `item.href` uses hyphens (`/diagnostic-center`).
Because `/diagnostic-center` (`href`) did not equal `/diagnostic_center` (`basePath`), the navigation check erroneously evaluated `pathname.startsWith(item.href)`. Since `/diagnostic-center/results` starts with `/diagnostic-center`, the Dashboard item lit up as active simultaneously with the Results page.

**Fix Applied:**
Updated the `basePath` regex generation string to `.replace(/_/g, '-')` to securely normalize `diagnostic_center` to `diagnostic-center` matching the actual URL schemas in Next.js. This allowed `item.href === basePath` to correctly bypass the `startsWith` check, successfully decoupling Dashboard from sub-routes.

## 3. Files Changed
- `swastik-web/src/app/diagnostic-center/results/page.tsx`
- `swastik-web/src/components/shared/DashboardLayout.tsx`

## 4. Verification Results
- KPI Active States: Visuals verified as single 2px line with corresponding contextual backgrounds (`border-2 shadow-sm border-purple-500 bg-purple-50/80`).
- Sidebar Routing States: Only `Results` is visually active on `/diagnostic-center/results`. `Dashboard` is correctly isolated.
- **Frontend Compilation Checks**:
  - `npx tsc --noEmit`: PASS
  - `npm run lint`: PASS 
  - `npm run build`: PASS
