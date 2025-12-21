# Code Review: Belknap Red-Line Tracker

**Reviewer:** Senior Engineer
**Date:** December 2024
**Overall Assessment:** Good foundation with room for improvement

---

## Executive Summary

This is a well-structured React PWA for tracking hiking progress on Belknap Range trails. The codebase demonstrates solid understanding of modern React patterns, TypeScript, and geospatial concepts. However, there are several areas that need attention before production deployment.

**Strengths:**
- Clean component organization with clear separation of concerns
- Good use of custom hooks for business logic
- Proper TypeScript typing throughout
- Comprehensive test coverage for critical hooks
- Smart code-splitting and lazy loading

**Areas for Improvement:**
- Memory leak risks in several hooks
- Duplicate code that should be extracted
- Missing error boundaries
- Accessibility gaps
- Some performance concerns
- 1 high-severity npm vulnerability (xlsx package)

---

## Critical Issues

### 1. Memory Leak in `useTrackRecording` Hook

**File:** `src/hooks/useTrackRecording.ts:62-86`

The `addPoint` function modifies state based on previous state inside a setState callback, but also calls `setTotalDistance` inside that callback. This nested state update pattern can cause issues and the callback references stale closure values.

```typescript
setTrackPoints((prev) => {
  const newPoints = [...prev, point]
  // This setTotalDistance call references `prev` which is now stale
  if (prev.length > 0) {
    const lastPoint = prev[prev.length - 1]
    const distance = calculateDistance(...)
    setTotalDistance((d) => d + distance)  // Called inside another setState
  }
  return newPoints
})
```

**Recommendation:** Separate the state updates or use a reducer pattern to handle related state atomically.

### 2. Missing Cleanup in `useEffect` for Position Tracking

**File:** `src/components/map/TrailMap.tsx:51-60`

The effect that adds points to the track during recording doesn't have proper dependencies and could cause stale closures:

```typescript
useEffect(() => {
  if (isRecording && position) {
    addPoint({...})
  }
}, [isRecording, position, addPoint])
```

If `addPoint` changes reference (which it will when `isRecording` changes), this could cause duplicate points or missed points.

### 3. Race Condition in Track Completion

**File:** `src/components/map/TrailMap.tsx:83-97`

The `toggleRecording` function has a race condition where `stopRecording()` is called after setting pending completions, but the `newlyCompletedTrails` check happens before stop:

```typescript
if (newlyCompletedTrails.length > 0) {
  setPendingCompletions(newlyCompletedTrails)
  setShowCompletionPrompt(true)
}
await stopRecording()  // Track data might change here
```

The prompt shows trails based on the state before recording stops, but `stopRecording` saves the final track data. If the last few points affected trail detection, the user sees outdated information.

---

## High Priority Issues

### 4. Duplicate Haversine Distance Function

**Files:**
- `src/hooks/useGeolocation.ts:31-48`
- `src/hooks/useTrackRecording.ts:17-34`

The exact same `calculateDistance` function is duplicated in two files. This violates DRY and creates maintenance burden.

**Recommendation:** Extract to `src/services/geo/distance.ts` and import where needed.

### 5. No Error Boundary Implementation

The app has no error boundaries. If any component throws during rendering, the entire app crashes with a white screen. This is particularly risky for:
- Map rendering failures (network issues with tiles)
- Database operations
- Malformed trail data

**Recommendation:** Add error boundaries at least around:
- The `<TrailMap />` component
- Each lazy-loaded page
- Database-dependent components

### 6. Inefficient Trail Lookup in `isTrailCompleted`

**File:** `src/hooks/useCompletions.ts:50-54`

```typescript
const isTrailCompleted = useCallback(
  (trailId: string): boolean => {
    return completedTrailIds.includes(trailId)  // O(n) lookup
  },
  [completedTrailIds]
)
```

`completedTrailIds` is an array, so `includes()` is O(n). This is called repeatedly in loops (TrailsPage, TrailMap). With 59 trails and multiple renders, this adds up.

**Recommendation:** Change `completedTrailIds` to a `Set<string>` instead of an array.

### 7. Uncontrolled Date Parsing in Import

**File:** `src/services/completionImport.ts:49`

```typescript
const date = new Date(obj.completedAt as string | number | Date)
```

This accepts any date format without validation of reasonable ranges. A user could import dates far in the future or malformed strings that create invalid Date objects (which pass the `isNaN` check as valid).

**Recommendation:** Add range validation (e.g., date must be between 2000 and current date + 1 day).

---

## Medium Priority Issues

### 8. Missing Loading States for Database Operations

**File:** `src/hooks/useCompletions.ts:8`

```typescript
const completions = useLiveQuery(() => db.completions.toArray()) ?? []
```

The initial state is an empty array, so there's no way to distinguish between "still loading" and "no completions". This could cause UI flicker or incorrect empty states.

**Recommendation:** Add an `isLoading` state similar to `useTrackHistory`.

### 9. Hardcoded Magic Numbers

**File:** `src/services/geo/trailMatcher.ts`

Multiple magic numbers without constants:
- `50` meters buffer (lines 26, 82, 107)
- `0.8` (80%) coverage threshold (lines 83, 123)
- `0.1` (10%) minimum coverage (lines 119, 130)
- `10` meters sample interval (line 55)

**Recommendation:** Extract to named constants at the top of the file:
```typescript
const DEFAULT_BUFFER_METERS = 50
const COMPLETION_THRESHOLD = 0.8
const NEARBY_THRESHOLD = 0.1
const SAMPLE_INTERVAL_METERS = 10
```

### 10. Accessibility Issues

**Multiple Files:**

1. **TrailMap.tsx:** No keyboard navigation for map controls. Screen reader users cannot access location/recording buttons.

2. **CompletionModal.tsx:** Missing focus trap. Users can tab outside the modal to hidden content.

3. **ProgressPage.tsx:** The SVG progress ring lacks ARIA labels:
   ```typescript
   <svg className="w-32 h-32 transform -rotate-90">
   ```
   Should have `role="progressbar"` and `aria-valuenow={percentComplete}`.

4. **SettingsPage.tsx:119:** Custom toggle switch lacks proper ARIA:
   ```typescript
   role="switch"
   aria-checked={isOfflineMode}
   ```
   Good start, but missing `aria-label` describing what it toggles.

### 11. Potential XSS in CSV Export

**File:** `src/services/redlineExport.ts:167`

```typescript
const notes = trail.notes.replace(/"/g, '""')
lines.push(`"${trail.name}",${trail.distance},${dateStr},"${notes}"`)
```

While this handles double quotes, it doesn't escape newlines or other CSV injection characters. A malicious import could contain `=cmd|' /C calc'!A0` style payloads.

**Recommendation:** Also escape `=`, `+`, `-`, `@` at the start of cells, and handle newlines.

### 12. Missing Type for Trail Areas

**File:** `src/types/trail.ts:9`

```typescript
area?: string
```

The `area` field is a free-form string, but the app expects specific values (defined in `redlineExport.ts`). This should be a union type:

```typescript
type TrailArea =
  | 'Lockes Hill'
  | 'Mt. Rowe & Gunstock Mountain'
  | 'Belknap Mountain'
  // ... etc
area?: TrailArea
```

---

## Low Priority Issues

### 13. Inconsistent Link Usage

**File:** `src/pages/ProgressPage.tsx:187-192`

```typescript
<a href="/trails" className="...">
  Find Your Next Hike
</a>
```

Uses a native `<a>` tag instead of React Router's `<Link>`. This causes a full page reload instead of client-side navigation.

### 14. Unused Component Export

**File:** `src/components/map/TrailMap.tsx:471-504`

`TrailheadMarkers` is exported but never used. The comment says "for later use" but it's been in the codebase. Either use it or remove it.

### 15. Inconsistent Error Handling Patterns

Some async functions use try/catch, others don't:
- `handleImportJSON` (SettingsPage.tsx:45-87) - has try/catch
- `handleClearData` (SettingsPage.tsx:90-93) - no try/catch
- `confirmCompletions` (TrailMap.tsx:100-110) - no try/catch

**Recommendation:** Add consistent error handling with user feedback for all database operations.

### 16. Test Coverage Gaps

The test files focus on hooks but lack:
- Component integration tests
- TrailMatcher algorithm edge cases
- Error state testing
- Import validation edge cases

### 17. Console Statements

No console.log statements found (good!), but also no structured logging for debugging production issues.

**Recommendation:** Consider adding a logging service for production debugging.

### 18. Bundle Size Consideration

**File:** `package.json`

`xlsx` package is included in devDependencies but the code doesn't appear to use it. If it was used for development tooling, that's fine, but verify it's not accidentally bundled.

### 19. PMTiles Provider Default Context

**File:** `src/providers/PMTilesProvider.tsx:37-43`

```typescript
const PMTilesContext = createContext<PMTilesContextValue>({
  isOfflineReady: false,
  isOfflineMode: false,
  setOfflineMode: () => {},  // Silent no-op
  offlineStyle: null,
  error: null,
})
```

If `usePMTiles` is called outside the provider, it silently returns defaults. Consider throwing an error to catch misuse.

### 20. Date Timezone Handling

**File:** `src/components/trails/CompletionModal.tsx:17`

```typescript
const [date, setDate] = useState(new Date().toISOString().split('T')[0])
```

This uses UTC date, which could show "yesterday" if the user is in a western timezone late at night. Consider using local date:
```typescript
new Date().toLocaleDateString('en-CA') // YYYY-MM-DD format
```

---

## Code Style Observations

### Positive Patterns
- Consistent use of named exports
- Good component file organization
- Proper use of TypeScript interfaces
- Clear function naming
- Good use of useMemo/useCallback for optimization

### Improvement Opportunities
- Some files exceed 300 lines (TrailMap.tsx at 505 lines) - consider splitting
- Inconsistent prop destructuring style
- Some components mix concerns (TrailMap handles both display and recording state)

---

## Security Considerations

1. **Local Storage Usage** (`PMTilesProvider.tsx:85`): Stores user preference, acceptable for non-sensitive data.

2. **IndexedDB Storage**: GPS tracks contain location data. Consider:
   - Adding a privacy notice
   - Providing data export before clear
   - Maximum retention period

3. **External Dependencies**: Map tiles fetched from `tiles.openfreemap.org`. Consider:
   - Documenting the dependency
   - Having a fallback if service is unavailable

---

## npm Audit Results

```
# npm audit report

xlsx  *
Severity: high
Prototype Pollution in sheetJS - https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
SheetJS Regular Expression Denial of Service (ReDoS) - https://github.com/advisories/GHSA-5pgg-2g8v-p9x9
No fix available
node_modules/xlsx

1 high severity vulnerability
```

**Analysis:** The `xlsx` package has two known vulnerabilities:

1. **Prototype Pollution (GHSA-4r6h-8v6p-xvw6):** Attackers could potentially modify object prototypes through crafted spreadsheet files.

2. **ReDoS (GHSA-5pgg-2g8v-p4x9):** Malicious input could cause catastrophic backtracking in regex processing, leading to denial of service.

**Impact Assessment:** The package is listed in `devDependencies`, which means:
- It should NOT be bundled into production builds
- Risk is limited to development/build environment
- However, if used for processing user-uploaded files during development, the risk remains

**Recommendations:**
1. Verify this package is not accidentally imported in production code
2. If the package is unused, remove it entirely: `npm uninstall xlsx`
3. If needed for development tooling, consider alternatives like `exceljs` or `node-xlsx`
4. Never process untrusted spreadsheet files with this library

---

## Recommended Priority Order

1. **Remove or replace xlsx package** (high-severity vulnerability)
2. Fix memory leak in useTrackRecording
3. Add error boundaries
4. Fix race condition in toggle recording
5. Extract duplicate distance calculation
6. Change completedTrailIds to Set
7. Add proper loading states
8. Address accessibility issues
9. Extract magic numbers to constants
10. Fix XSS potential in CSV export
11. Add consistent error handling

---

## Conclusion

This is solid work for a junior engineer. The architecture is sound, TypeScript is used correctly, and the feature set is impressive. The issues identified are common in production codebases and addressing them will significantly improve reliability and maintainability.

The most critical items are the memory/race condition issues in the GPS tracking flow, as these affect the core functionality. The accessibility and error handling improvements would benefit all users.

Keep up the good work!
