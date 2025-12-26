# Belknap Red-Line Tracker - UI Specification

> Design specification for the trail tracking PWA interface.

---

## Design Principles

1. **Hike-Ready** - Usable with one hand, in bright sunlight, with gloves
2. **Progress-Focused** - Always show how far you've come
3. **Offline-First** - Full functionality without cell service
4. **Minimal Friction** - Common actions in 1-2 taps

---

## Device Targets

| Device | Viewport | Priority |
|--------|----------|----------|
| iPhone SE | 375 x 667 | Primary (design target) |
| iPhone 14 | 390 x 844 | Primary |
| Android Mid | 360 x 800 | Primary |
| iPad | 768 x 1024 | Secondary |
| Desktop | 1280+ | Tertiary (responsive) |

---

## Color System

### Semantic Colors

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| Complete | Green | `#22C55E` | Completed trails, success states |
| Incomplete | Red | `#EF4444` | Remaining trails, warnings |
| Location | Blue | `#3B82F6` | User position, GPS active |
| Primary | Slate | `#1E293B` | Text, headers |
| Secondary | Slate | `#64748B` | Secondary text |
| Background | White | `#FFFFFF` | Main background |
| Surface | Gray | `#F8FAFC` | Cards, elevated surfaces |
| Border | Gray | `#E2E8F0` | Dividers, borders |

### Trail Difficulty Colors

| Difficulty | Color | Hex |
|------------|-------|-----|
| Easy | Green | `#22C55E` |
| Moderate | Yellow | `#EAB308` |
| Difficult | Red | `#EF4444` |

---

## Typography

Using system fonts for performance:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

### Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 (Page Title) | 24px | 700 | 1.2 |
| H2 (Section) | 20px | 600 | 1.3 |
| H3 (Card Title) | 16px | 600 | 1.4 |
| Body | 14px | 400 | 1.5 |
| Caption | 12px | 400 | 1.4 |
| Stat Number | 32px | 700 | 1.1 |

---

## Spacing System

Based on 4px grid:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline spacing |
| sm | 8px | Tight spacing |
| md | 16px | Default spacing |
| lg | 24px | Section spacing |
| xl | 32px | Page margins |

---

## Touch Targets

- **Minimum size**: 44 x 44px (Apple HIG)
- **Recommended**: 48 x 48px for primary actions
- **Spacing between targets**: 8px minimum

---

## Layout Zones

```
┌─────────────────────────────────────┐
│           HEADER (56px)             │  ← Status, title, actions
├─────────────────────────────────────┤
│                                     │
│                                     │
│           CONTENT AREA              │  ← Scrollable content
│          (fills remaining)          │
│                                     │
│                                     │
├─────────────────────────────────────┤
│        NAVIGATION (64px)            │  ← Bottom tabs (thumb zone)
└─────────────────────────────────────┘
```

### Thumb Zone Consideration

Primary actions placed in bottom 2/3 of screen for one-handed use:
- Bottom navigation: Always accessible
- Floating action buttons: Bottom-right corner
- Modal actions: Bottom of modal

---

## Components

### 1. Header

```
┌─────────────────────────────────────┐
│ ≡  Belknap Tracker      [⚙]  [📍]  │
└─────────────────────────────────────┘
```

- Height: 56px
- Left: Menu/back button
- Center: Page title
- Right: Contextual actions (settings, location)

### 2. Bottom Navigation

```
┌─────────────────────────────────────┐
│   🗺️        📊        📋        ⚙️   │
│   Map    Progress   Trails  Settings│
└─────────────────────────────────────┘
```

- Height: 64px (including safe area)
- 4 tabs maximum
- Active state: Filled icon + color
- Inactive: Outlined icon + gray

### 3. Trail Card

```
┌─────────────────────────────────────┐
│ ● Mount Belknap via East Trail      │
│   2.4 mi  •  Moderate  •  1,200 ft  │
│   ✓ Completed Dec 15, 2025          │
└─────────────────────────────────────┘
```

- Status indicator: Green dot (complete) / Red dot (incomplete)
- Primary: Trail name
- Secondary: Distance, difficulty, elevation
- Tertiary: Completion status/date

### 4. Progress Card

```
┌─────────────────────────────────────┐
│         ┌───────────────┐           │
│         │     42%       │           │
│         │   ████░░░░    │           │
│         └───────────────┘           │
│   30 of 72 trails  •  32.5 miles    │
└─────────────────────────────────────┘
```

- Large percentage number
- Progress ring or bar
- Supporting stats below

### 5. Map Overlay Controls

```
         ┌────┐
         │ ⊕  │  Zoom in
         ├────┤
         │ ⊖  │  Zoom out
         ├────┤
         │ ◎  │  Center on user
         └────┘
```

- Floating, right side
- 44x44px touch targets
- Semi-transparent background

### 6. Trail Popup (Map)

```
┌─────────────────────────────────────┐
│ Mount Belknap via East Trail    [×] │
├─────────────────────────────────────┤
│ 2.4 mi  •  Moderate  •  1,200 ft    │
├─────────────────────────────────────┤
│ [ View Details ]  [ Mark Complete ] │
└─────────────────────────────────────┘
```

- Appears on trail tap
- Quick actions without navigating away

### 7. Completion Modal

```
┌─────────────────────────────────────┐
│      Mark Trail Complete        [×] │
├─────────────────────────────────────┤
│                                     │
│  Mount Belknap via East Trail       │
│  2.4 mi  •  Moderate                │
│                                     │
│  Date Completed                     │
│  ┌─────────────────────────────┐    │
│  │ December 20, 2025        📅 │    │
│  └─────────────────────────────┘    │
│                                     │
│  Notes (optional)                   │
│  ┌─────────────────────────────┐    │
│  │ Great views at summit!      │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│ [ Cancel ]          [ Save ✓ ]      │
└─────────────────────────────────────┘
```

- Full-screen on mobile
- Date defaults to today
- Notes optional
- Clear primary action

### 8. Offline Indicator

```
┌─────────────────────────────────────┐
│ ⚠ Offline - Data will sync later   │
└─────────────────────────────────────┘
```

- Appears below header when offline
- Yellow/amber color
- Dismissible or auto-hides

---

## Screen Specifications

### 1. Map View (Primary)

**Purpose**: Visualize trails and location

**Elements**:
- Full-screen map (below header)
- Trail polylines (green = complete, red = incomplete)
- User location marker (blue dot with accuracy circle)
- Floating zoom/center controls (right side)
- Trail popup on tap
- Optional: Floating progress indicator (top-left)

**Interactions**:
- Pan/zoom map
- Tap trail → show popup
- Tap popup "View Details" → Trail Detail
- Tap popup "Mark Complete" → Completion Modal

### 2. Progress Dashboard

**Purpose**: Motivation and overview

**Elements**:
- Large progress ring/percentage (hero)
- Stats row: Trails done, Miles hiked, Days active
- Recent completions list (last 5)
- "Trails Remaining" section with count
- Quick action: "Find Next Hike" button

**Interactions**:
- Tap recent completion → Trail Detail
- Tap "Find Next Hike" → Trails list (filtered incomplete)
- Pull to refresh (future: sync)

### 3. Trail List

**Purpose**: Browse and filter all trails

**Elements**:
- Search bar (sticky)
- Filter chips: All | Complete | Incomplete | Easy | Moderate | Difficult
- Scrollable trail cards
- Sort options: Name, Distance, Difficulty, Status

**Interactions**:
- Type to search by name
- Tap filter to apply
- Tap trail card → Trail Detail
- Long-press → Quick complete (optional)

### 4. Trail Detail

**Purpose**: Full trail info and actions

**Elements**:
- Trail name (H1)
- Stats row: Distance, Elevation, Difficulty
- Completion status with date (if complete)
- Notes (if any)
- Map preview showing trail highlighted
- Action buttons: Mark Complete / Remove Completion

**Interactions**:
- Tap "Mark Complete" → Completion Modal
- Tap "Remove" → Confirmation → Remove
- Tap map preview → Full map centered on trail

### 5. Settings

**Purpose**: App configuration

**Elements**:
- Profile section (future: account)
- Data Management: Export, Import, Clear Data
- App Info: Version, About, Feedback link
- Theme toggle (future: dark mode)

---

## Prototype Variants

### Prototype A: Map-Centric

**Philosophy**: The map IS the app. Everything overlays the map.

**Characteristics**:
- Map covers 80%+ of viewport
- Bottom sheet for trail details (slides up)
- Floating progress pill (top-left corner)
- Minimal chrome, maximum map
- Swipe up from bottom for trail list

**Best for**: Users who think spatially, want to see the "big picture"

### Prototype B: Dashboard-First

**Philosophy**: Gamification and progress drive engagement.

**Characteristics**:
- Dashboard is home screen
- Large progress visualization (ring chart)
- Card-based UI throughout
- Map is a separate tab
- Achievement-style completed trails

**Best for**: Users motivated by progress tracking, completionists

### Prototype C: List-Focused

**Philosophy**: Efficient, information-dense, power-user friendly.

**Characteristics**:
- Trail list is primary view
- Inline completion toggles (checkboxes)
- Compact trail rows (more visible at once)
- Map is supplementary
- Batch operations possible

**Best for**: Systematic hikers, those who plan extensively

---

## Responsive Behavior

### Mobile (< 640px)
- Single column layout
- Bottom navigation
- Full-screen modals
- Stacked cards

### Tablet (640px - 1024px)
- Two-column where appropriate
- Side navigation option
- Half-screen modals
- Map + list split view

### Desktop (> 1024px)
- Three-column layout possible
- Persistent sidebar
- Modal dialogs (not full-screen)
- Map + detail panel

---

## Accessibility

- **Color contrast**: WCAG AA minimum (4.5:1)
- **Focus indicators**: Visible keyboard focus
- **Touch targets**: 44px minimum
- **Screen reader**: Semantic HTML, ARIA labels
- **Motion**: Respect prefers-reduced-motion

---

## Mock Data

Sample trails for prototypes:

```json
[
  {"id": "1", "name": "Mount Belknap via East Trail", "distance": 2.4, "difficulty": "moderate", "elevation": 1200, "complete": true, "date": "2025-12-15"},
  {"id": "2", "name": "Mount Major via Main Trail", "distance": 2.8, "difficulty": "easy", "elevation": 1100, "complete": true, "date": "2025-12-10"},
  {"id": "3", "name": "Gunstock Mountain", "distance": 3.2, "difficulty": "moderate", "elevation": 1400, "complete": false},
  {"id": "4", "name": "Piper Mountain", "distance": 2.0, "difficulty": "easy", "elevation": 800, "complete": false},
  {"id": "5", "name": "Mount Klem", "distance": 1.8, "difficulty": "easy", "elevation": 600, "complete": true, "date": "2025-11-28"},
  {"id": "6", "name": "Whiteface Mountain", "distance": 4.5, "difficulty": "difficult", "elevation": 1800, "complete": false},
  {"id": "7", "name": "Mount Mack", "distance": 2.2, "difficulty": "moderate", "elevation": 950, "complete": false},
  {"id": "8", "name": "Round Pond Trail", "distance": 1.5, "difficulty": "easy", "elevation": 400, "complete": true, "date": "2025-12-01"}
]
```

Summary: 8 trails, 4 complete (50%), 20.4 total miles, ~10.5 miles hiked

---

## Selected Design Direction

**Prototype B: Dashboard-First** was selected as the design direction.

### Key Characteristics
- Dashboard is home screen with large progress visualization
- Card-based UI throughout
- Map is a separate tab (not the primary view)
- Bottom tab navigation with 4 tabs: Progress, Map, Trails, Settings
- Achievement-style completed trails
- Gamification and progress drive engagement

### Implementation Notes
- Progress page (`/`) is the landing page
- Map page (`/map`) for spatial exploration
- Trails page (`/trails`) for browsing/filtering
- Settings page (`/settings`) for data management
