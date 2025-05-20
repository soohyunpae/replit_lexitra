
# Progress Bar and Review Status Display Issue Analysis

## Problem Description
The combined progress bar in `client/src/components/ui/combined-progress.tsx` is showing 0% for Reviewed status despite actual project data existing.

## Root Cause Analysis

1. Review Status Calculation:
- The current implementation only uses `reviewedCount` from `statusCounts` but does not properly handle the total counts
- The progress bar is not reflecting the actual project data because the calculation logic is oversimplified

2. Data Flow:
- Project stats are passed through multiple components
- The reviewedPercentage calculation appears to be done in multiple places leading to inconsistency

## Code Analysis

Affected files:
1. `client/src/components/ui/combined-progress.tsx` - Main display component
2. `client/src/pages/project.tsx` - Parent component providing data
3. `server/routes.ts` - Backend API providing project statistics

## Solution Implementation

### 1. Fix Combined Progress Component

Update `combined-progress.tsx` to properly handle the progress calculation:
```typescript
// Only use the provided reviewedPercentage prop
// Remove redundant percentage calculation
const reviewedPercentageDisplay = Math.round(reviewedPercentage);
```

### 2. Ensure Proper Data Flow

The parent component should provide:
- Accurate reviewedPercentage 
- Complete statusCounts object
- Valid totalSegments count

### 3. Code Changes Required

The following changes are needed:

1. Update combined-progress.tsx to use props directly
2. Ensure project.tsx provides correct stats
3. Verify API response data structure

## Implementation Details

1. Combined Progress Component Update:
```typescript
export function CombinedProgress({
  reviewedPercentage,
  statusCounts,
  totalSegments,
  ...props
}: CombinedProgressProps) {
  return (
    <div className="w-full space-y-1.5">
      <ProgressPrimitive.Root>
        <div className="h-full w-full flex overflow-hidden">
          <div 
            className="h-full bg-green-200"
            style={{ width: `${reviewedPercentage}%` }}
          />
        </div>
      </ProgressPrimitive.Root>
      {showPercentage && (
        <div>
          <span>Reviewed: {Math.round(reviewedPercentage)}%</span>
        </div>
      )}
    </div>
  );
}
```

2. Project Stats API Response Format:
```typescript
interface ProjectStats {
  totalSegments: number;
  reviewedPercentage: number;
  statusCounts: {
    Reviewed: number;
    "100%": number;
    Fuzzy: number;
    MT: number;
    Edited: number;
    Rejected: number;
  };
}
```

## Testing Steps

1. Verify API response contains correct statistics
2. Check progress bar updates properly with new data
3. Validate percentage calculations are accurate
4. Test with various project states (empty, partial, complete)
