# Page 7 — What-If Simulation Walkthrough

## Summary of Accomplishments

Page 7 (**WHAT-IF SIMULATION**) of the `MnVision 360` workflow has been fully implemented, verified, and integrated following the official MOIL Limited PSU visual design system (`#1B2170` royal navy, `#F8FAFC` light canvas, gold/amber accents, thin borders, breadcrumbs).

---

### **1. Exact Files Changed**

1. `backend/app/ml/whatif_simulator.py`:
   - Completely removed `PrescriptiveMineOptimizer` imports and execution.
   - Replaced demo constants (`2800`, `2450`, `350`, `400 * horizon_days`) with dynamic persisted workflow context inputs.
   - Implemented relative delta formulation across all 8 variables supporting both deterioration ($\Delta < 0$) and improvement ($\Delta > 0$).
   - Added prototype simulation disclosure label.
2. `backend/app/api/whatif.py`:
   - Updated `WhatIfRequest` schema to accept persisted workflow context parameters (`parent_scenario_id`, `forecast_id`, `shortfall_id`, `mine_id`, `mine_type`, `target_tonnes`, `baseline_forecast_tonnes`).
   - Enhanced audit logging to record `whatif_scenario_id` and production delta.
3. `tests/backend/test_whatif.py`:
   - Created backend unit test suite verifying deterioration, improvement, prototype disclosure label, and optimizer isolation.
4. `frontend/src/services/api.ts`:
   - Added `runWhatIfSimulation` and `whatifApi.simulate` / `whatifApi.getBaseline`.
5. `frontend/src/pages/WhatIfSimulator.tsx`:
   - Built Page 7 frontend component with MOIL PSU design, breadcrumbs (`Home > Estimate Production > Production Shortfall > Analyze Why > Corrective Actions > Optimization > What-If`), context strip badge, prototype disclosure banner, interactive scenario sliders/controls, production bar comparison visualizer, relative delta impact breakdown, and scenario run history log.

---

### **2. Exact Baseline Source**

The baseline values are loaded directly from the persisted workflow context (`workflowApi.getState()` / URL parameters):
- **Target Production (`target_tonnes`)**: `2,800.0 t`
- **Baseline Forecast (`baseline_forecast_tonnes` / `forecast_id`)**: `2,450.0 t` (`FCST-2026-48B5`)
- **Baseline Shortfall (`baseline_shortfall_tonnes` / `shortfall_id`)**: `350.0 t` (`SF-2026-48B5`)
- **Parent Scenario ID (`parent_scenario_id`)**: `SCN-2026-48B5` (Page 6 optimized scenario)

---

### **3. Baseline Handling for Every Supported Variable & Delta Formulas**

| Variable | Baseline Handling | Relative Delta Formula | Improvement Case | Deterioration Case |
| :--- | :--- | :--- | :--- | :--- |
| **Equipment Downtime** | `E-17: 4.0h`, `EX-104: 28.0h` | $\Delta \text{Impact} = - (\text{User Downtime} - \text{Base Downtime}) \times 8.5\text{ MT/hr}$ | Downtime 28h $\rightarrow$ 5h: $\Delta = \mathbf{+195.5\text{ t}}$ | Downtime 4h $\rightarrow$ 35h: $\Delta = \mathbf{-263.5\text{ t}}$ |
| **Equipment Availability** | `EX-104: MAINTENANCE`, `E-17: OPERATIONAL` | Restore MAINTENANCE $\rightarrow +120\text{ t/day}$; Force OPERATIONAL offline $\rightarrow -120\text{ t/day}$ | Restoring EX-104: $\Delta = \mathbf{+360.0\text{ t}}$ (3 days) | E-17 Outage: $\Delta = \mathbf{-360.0\text{ t}}$ (3 days) |
| **Monsoon Rainfall** | Baseline: `12.0 mm/day` | $\Delta \text{Impact} = - (\text{User Rain} - 12.0) / 10.0 \times 45.0 \times (\text{horizon} / 7.0)$ | Rain 12mm $\rightarrow$ 0mm: $\Delta = \mathbf{+54.0\text{ t}}$ | Rain 12mm $\rightarrow$ 45mm: $\Delta = \mathbf{-148.5\text{ t}}$ |
| **Haul Road Condition** | Baseline: `"GOOD"` (0t penalty) | $\Delta \text{Impact} = \text{Penalty(Base Road)} - \text{Penalty(User Road)}$ | Road POOR $\rightarrow$ GOOD: $\Delta = \mathbf{+110.0\text{ t}}$ | Road GOOD $\rightarrow$ POOR: $\Delta = \mathbf{-110.0\text{ t}}$ |
| **Blasting Delay** | Baseline: `0.0 hrs` | $\Delta \text{Impact} = - (\text{User Blasting} - 0.0) \times 18.0\text{ MT/hr}$ | Delay 5h $\rightarrow$ 0h: $\Delta = \mathbf{+90.0\text{ t}}$ | Delay 0h $\rightarrow$ 5h: $\Delta = \mathbf{-90.0\text{ t}}$ |
| **Development Delay** | Baseline: `0.0 days` | $\Delta \text{Impact} = - (\text{User Dev} - 0.0) \times 35.0\text{ MT/day}$ | Delay 3d $\rightarrow$ 0d: $\Delta = \mathbf{+105.0\text{ t}}$ | Delay 0d $\rightarrow$ 3d: $\Delta = \mathbf{-105.0\text{ t}}$ |
| **Block Readiness** | Baseline: `B-17: 86%`, `B-12: 88.5%` | Restoring DEV/UNAVAIL block $\rightarrow +180\text{t}$; Marking active unserviceable $\rightarrow -180\text{t}$ | Activating Block B-09: $\Delta = \mathbf{+180.0\text{ t}}$ | Disabling Block B-17: $\Delta = \mathbf{-180.0\text{ t}}$ |
| **Crusher Capacity** | Baseline: `100.0%` (1,200 t/day) | $\Delta \text{Impact} = (\text{User Capacity \%} - 100.0) \times 4.2 \times \text{horizon\_days}$ | Capacity 70% $\rightarrow$ 100%: $\Delta = \mathbf{+126.0\text{ t}}$ | Capacity 100% $\rightarrow$ 70%: $\Delta = \mathbf{-126.0\text{ t}}$ |

- **Total Production Calculation**:
  $$\text{What-If Predicted Production} = \text{Baseline Forecast Tonnes} + \sum \Delta \text{Impact}_i$$
  $$\text{Remaining Shortfall} = \max(0.0, \text{Target Tonnes} - \text{What-If Predicted Production})$$

---

### **4. Verification & Testing Summary**

1. **Improvement & Deterioration Cases Tested**:
   - **Improvement Test**: Restoring EX-104 from maintenance and reducing downtime to 5h yielded $\mathbf{+555.5\text{ t}}$ production increase over baseline (`3,005.5 t` forecast, `0.0 t` shortfall).
   - **Deterioration Test**: Setting E-17 offline, downtime to 35h, rainfall to 45mm, and road to POOR yielded $\mathbf{-882.0\text{ t}}$ production loss (`1,568.0 t` forecast, `1,232.0 t` shortfall).
2. **Baseline Protection**: Verified baseline forecast (`2,450.0 t`) and Page 6 scenario (`SCN-2026-48B5`) remain 100% unchanged. Every simulation run generates a unique new ID (`SCN-2026-W3E45`, `SCN-2026-W7173`).
3. **Optimizer Isolation**: Confirmed `PrescriptiveMineOptimizer` is NOT called on Page 7. `recovery_plans` field is omitted from responses.
4. **Backend Unit Tests (`python -m pytest tests/backend/`)**: **17/17 passed** in 10.81s.
5. **Frontend Build (`cmd /c npm run build`)**: **0 errors** (built dist in 4.61s).
6. **Live API Endpoint Test (`http://127.0.0.1:8000/api/whatif/simulate`)**: Returned HTTP 200 OK with correct improvement and deterioration deltas.

---

## Acceptance Test Matrix (Page 7)

| Acceptance Test | Requirement | Verified Result | Status |
| :--- | :--- | :--- | :---: |
| **Test 1** | Page 6 navigates to Page 7 | Navigates to `/what-if` preserving workflow search params | **PASS** |
| **Test 2** | Context carryover | `target_id`, `mine_id`, `forecast_id`, `shortfall_id`, `scenario_id` preserved | **PASS** |
| **Test 3** | Baseline forecast protection | Baseline forecast (`2,450.0 t`) remains strictly unchanged | **PASS** |
| **Test 4** | Optimizer isolation | `PrescriptiveMineOptimizer` is NOT invoked on Page 7 | **PASS** |
| **Test 5** | Prototype disclosure label | Explicit disclosure banner & API honesty label rendered | **PASS** |
| **Test 6** | Deterioration scenario | Increasing downtime / rain reduces production ($\Delta < 0$) | **PASS** |
| **Test 7** | Improvement scenario | Restoring equipment / reducing downtime increases production ($\Delta > 0$) | **PASS** |
| **Test 8** | New Scenario ID creation | Unique `SCN-2026-WXXX` generated for every run | **PASS** |
| **Test 9** | Reset control | `[ RESET TO BASELINE ]` restores baseline inputs | **PASS** |
| **Test 10** | MOIL PSU visual design | `#1B2170` royal navy design system & breadcrumbs preserved | **PASS** |
| **Test 11** | Clean build & test pass | Frontend build **0 errors**, Backend pytest **17/17 PASS** | **PASS** |
