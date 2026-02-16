# Dashboard UI Redesign Plan

## Problem Statement

The current dashboard has two main issues:
1. **Page refresh on updates** - The SSE handler does `location.reload()` which is jarring and loses scroll position
2. **Single process view** - Shows one process at a time, hard to follow multiple processes being worked on simultaneously

## Proposed Solution

### 1. Dynamic Updates Without Page Refresh

**Current behavior:**
```javascript
eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.type === 'process-update') {
    location.reload(); // ❌ Jarring full page reload
  }
};
```

**Proposed behavior:**
- Server sends actual data in SSE events, not just a signal to reload
- Client updates DOM elements directly using the new data
- Smooth animations for state changes
- Preserve scroll position and user focus

### 2. Multi-Process View with Active Focus

**Layout concept:**
```
┌─────────────────────────────────────────────────────────────────┐
│  procside Dashboard                              🔴 Live        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔄 Dark Mode Feature (proc-002) - ACTIVE               │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 40%   │   │
│  │  Step 2/5: Implement CSS variables                      │   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │ [✓] Research design requirements                   │  │   │
│  │  │ [✓] Create color palette                          │  │   │
│  │  │ [▶] Implement CSS variables ← CURRENT             │  │   │
│  │  │ [ ] Add toggle switch                             │  │   │
│  │  │ [ ] Test across browsers                          │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ 📋 Main Process     │  │ 📋 Fix Login        │              │
│  │ proc-001            │  │ proc-003            │              │
│  │ ━━━━━━━━━━━ 17%     │  │ ━━━━━━━━━━━ 0%      │              │
│  │ Step 1/6            │  │ Step 0/4            │              │
│  │ planned             │  │ planned             │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Visual Hierarchy

**Active Process (Large, Focused):**
- Full width display
- All steps visible
- Current step highlighted with animation
- Evidence feed visible
- Decisions and risks visible

**Background Processes (Compact, Summary):**
- Card-based layout
- Show only: name, progress bar, current step, status
- Click to expand/focus
- Dimmed appearance
- Smaller font size

### 4. Animation and Transitions

**When process becomes active:**
- Smooth expand animation
- Highlight pulse effect
- Scroll into view

**When step changes:**
- Fade out old status, fade in new status
- Progress bar animates smoothly
- Current step indicator moves

**When new process created:**
- Slide in from bottom
- Brief highlight animation

## Technical Implementation

### Server-Side Changes

**Enhanced SSE Events:**
```typescript
// Instead of just signaling an update
{ type: 'process-update' }

// Send actual data
{
  type: 'process-update',
  data: {
    processes: [
      {
        id: 'proc-001',
        name: 'Main Process',
        status: 'planned',
        progress: 17,
        currentStep: 's1',
        steps: [...]
      },
      ...
    ],
    activeProcessId: 'proc-002',
    timestamp: '2026-02-16T23:05:00Z'
  }
}
```

**New API Endpoint:**
```
GET /api/processes - Returns JSON array of all processes
GET /api/process/:id - Returns JSON for specific process
```

### Client-Side Changes

**State Management:**
```javascript
let state = {
  processes: [],
  activeProcessId: null,
  focusedProcessId: null
};

// Update state from SSE
eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data);
  state = { ...state, ...update.data };
  render();
};

// Render function updates DOM efficiently
function render() {
  renderActiveProcess();
  renderBackgroundProcesses();
  updateProgressBars();
  highlightCurrentStep();
}
```

**Virtual DOM or Efficient Updates:**
- Option 1: Use a lightweight library like lit-html
- Option 2: Manual DOM updates with animations
- Option 3: Use template strings with innerHTML (simple but less efficient)

### File Changes Required

| File | Changes |
|------|---------|
| `src/dashboard/server.ts` | Add `/api/processes` endpoint, enhance SSE data |
| `src/dashboard/generator.ts` | Add JSON generation functions |
| `src/dashboard/templates/dashboard.html` | Complete rewrite with new layout |
| `src/dashboard/templates/styles.css` | New CSS with animations (extract from inline) |
| `src/dashboard/templates/app.js` | Client-side state management and rendering |

## Implementation Phases

### Phase 1: API Enhancement
- Add `/api/processes` JSON endpoint
- Enhance SSE to send full process data
- Keep existing HTML rendering for fallback

### Phase 2: Client-Side Rendering
- Create client-side JavaScript for dynamic updates
- Implement state management
- Add smooth animations

### Phase 3: Multi-Process View
- Implement active/background process layout
- Add focus switching
- Add visual hierarchy

### Phase 4: Polish
- Add keyboard navigation
- Add process filtering
- Add search functionality
- Mobile responsive design

## User Decisions

1. **Background processes clickable?** → No, active process is always the one Claude is currently working on (most recently updated)
2. **Animation styles to test:** → Create 4 variants accessible via URL paths:
   - `/1` - Fade transitions
   - `/2` - Slide transitions  
   - `/3` - Scale/zoom transitions
   - `/4` - Minimal animations (just highlight changes)

## Implementation Approach

Create a single dashboard template with a `data-animation-style` attribute that controls which CSS animations are used. The server will serve the same template but with different animation classes based on the URL path.
