# Swastik AI Consultation: End-to-End Math & Metric Calculation Guide

This document explains how AI consultation metrics are computed and used end to end during a live consultation.

---

## 1) End-to-End Flow (What happens during consultation)

1. **Patient-side CV pipeline computes raw health metrics** (camera/pose/face processing pipeline).
2. Patient sends metrics over WebSocket to AI service:
   - `ws/vitals/{session_id}/patient`
3. AI service (`main.py`) performs **Layer-1 deterministic rule checks** using `VitalsRuleEngine.evaluate(...)` and appends structured alerts.
4. Payload is written to Redis stream:
   - `telemedicine:vitals:{session_id}` (source-of-truth live stream)
5. Same payload is also written to ingest stream:
   - `telemedicine:vitals:ingest`
6. Background worker consumes ingest stream and creates compact **async AI reasoning** text, then publishes back to session stream.
7. Doctor client subscribes via WebSocket:
   - `ws/vitals/{session_id}/doctor`
   and receives live vitals + alerts + async reasoning.
8. When doctor asks AI question (`/consultations/:id/ai-assist`), backend forwards request to FastAPI `/api/ai/consult`.
9. FastAPI runs **Layer-2 clinical alert analysis** (`analyze_vitals_for_alerts`) + LLM reasoning and returns structured output.

---

## 2) Important architecture clarification

The AI service **does not run heavy CV extraction itself** in this codebase. It receives already-computed metrics and then does:

- deterministic threshold logic,
- severity tagging,
- stream-based fan-out,
- LLM clinical reasoning.

So, formulas below are split into:

- **A. Upstream CV formulas** (how metrics are conceptually computed before arriving), and
- **B. AI-service formulas** (what is mathematically done inside current AI service code).

---

## 3) Upstream CV Metric Formulas (conceptual measurement math)

These correspond to the documented pipeline notes in `VitalsData` comments.

### 3.1 Heart Rate (rPPG)
- ROI: facial skin pixels over time.
- Signal preprocessing: detrend + band-pass (`0.8–3 Hz`).
- FFT peak frequency: `f_peak`.
- **Formula:**
  - `HR (bpm) = 60 × f_peak`

### 3.2 Respiration Rate
- Track periodic chest/shoulder motion.
- Dominant breathing frequency `f_resp` (Hz).
- **Formula:**
  - `RR (/min) = 60 × f_resp`

### 3.3 SpO2 (experimental)
- Multi-channel rPPG features (RGB ratio features) -> regression model.
- **Model form:**
  - `SpO2 = f_regression(features_rgb_ppg)`

### 3.4 HRV (Stress)
From RR interval series `RR_i`:

- **RMSSD:**
  - `RMSSD = sqrt( (1/(N-1)) × Σ (RR_{i+1} - RR_i)^2 )`
- **SDNN:**
  - `SDNN = stddev(RR_i)`

### 3.5 Drowsiness (EAR)
For eye landmarks `p1..p6`:

- `EAR = (||p2-p6|| + ||p3-p5||) / (2 × ||p1-p4||)`
- Drowsiness score is a normalized continuous score derived from EAR behavior over time.

### 3.6 Pain (FACS)
- Action Units such as AU4, AU6, AU9 are detected.
- Pain score is mapped to `0–10` from AU intensity combination.
- **Typical weighted form:**
  - `pain_score = g(w4·AU4 + w6·AU6 + w9·AU9 + ...)`

### 3.7 Posture / Spine Angle
From pose vectors (shoulder/hip/knee or torso vectors):

- `θ = arccos( (u·v) / (||u|| ||v||) )`
- Posture labels (normal/slouching/unstable/lying_down) derive from angle + dynamics.

### 3.8 Fall Detection
- Uses posture angle change + vertical velocity trend over time.
- Rule/sequence model decides boolean `fall_detected`.

### 3.9 Tremor
- Landmark jitter signal `x(t)`.
- FFT gives dominant frequency `f_tremor`.
- Severity from amplitude/statistics -> `0–10`.

### 3.10 Skin condition
- CNN classifier output:
  - `class = argmax(p_i)`
  - `confidence = max(p_i)`

### 3.11 Pallor / Hemoglobin estimate
- Color features from conjunctiva/lips.
- Regression to hemoglobin estimate:
  - `Hb_est = f_regression(color_features)`
- Pallor score normalized to `[0,1]`.

### 3.12 Facial asymmetry
- Left/right landmark motion difference normalized:
  - `asymmetry_score = norm_diff(left_motion, right_motion)` in `[0,1]`

---

## 4) AI Service Mathematics (implemented in code)

## 4.1 Layer-1 deterministic rules (WebSocket ingest)
Implemented in `VitalsRuleEngine`.

General trigger equation:
- For each rule `(metric, op, threshold)`:
  - if `metric op threshold` => create alert `{code, metric, severity, threshold, current_value, timestamp}`.

Core Layer-1 thresholds:
- HR > 120 => `TACHYCARDIA` (critical)
- HR > 150 => `SEVERE_TACHYCARDIA` (critical)
- HR < 50 => `BRADYCARDIA` (critical)
- RR > 25 => `RESPIRATORY_DISTRESS` (warning)
- SpO2 < 92 => `HYPOXEMIA` (critical)
- Drowsiness > 0.8 => `SEVERE_DROWSINESS` (warning)
- Pain > 7 => `SEVERE_PAIN` (critical)
- Facial asymmetry > 0.6 => `STROKE_INDICATOR` (critical)
- Fall detected == true => `FALL_DETECTED` (critical)
- Tremor severity > 7 => `SEVERE_TREMOR` (warning)

## 4.2 Layer-2 deterministic clinical analysis (`/api/ai/consult`)
Implemented in `analyze_vitals_for_alerts(...)` with finer granularity.

Examples:

### Heart rate
- `HR > 150` severe tachycardia (critical)
- `120 < HR <= 150` tachycardia (critical)
- `HR < 40` severe bradycardia (critical)
- `40 <= HR < 50` bradycardia (critical)
- `100 < HR <= 120` elevated HR (warning)

### Respiration
- `RR > 35` severe tachypnea (critical)
- `25 < RR <= 35` tachypnea (warning)
- `RR < 6` severe bradypnea (critical)
- `6 <= RR < 8` bradypnea (warning)

### SpO2
- `SpO2 < 88` severe hypoxemia (critical)
- `88 <= SpO2 < 92` hypoxemia warning (warning)

### Drowsiness
- `score > 0.9` near unconscious (critical)
- `0.7 < score <= 0.9` severe drowsiness (warning)

### Pain
- `pain_score >= 8` severe pain (critical)
- `5 <= pain_score < 8` moderate pain (warning)

### Tremor
- `severity >= 7` severe tremor (critical)
- `4 <= severity < 7` significant tremor (warning)
- `< 4` mild tremor (info)
- If `3.5 <= frequency <= 6.5` => Parkinsonian frequency warning

### Pallor
- if `pallor_score > 0.8` => severe pallor (critical)
- else if `pallor_score > 0.5` => facial pallor (warning)

### Facial asymmetry
- if `score > 0.8` => severe asymmetry/stroke suspected (critical)
- else if `score > 0.6` => facial asymmetry/stroke indicator (critical)

### Temperature
- `T > 39.5` high fever (critical)
- `38.5 < T <= 39.5` fever (warning)
- `T < 35` hypothermia (critical)
- `35 <= T < 35.5` low temperature (warning)

### Systolic BP
- `SBP > 180` hypertensive crisis (critical)
- `140 < SBP <= 180` hypertension (warning)
- `SBP < 80` hypotension warning (warning)

## 4.3 Async AI worker severity aggregation
In `build_async_ai_reasoning(...)`:

- if no alerts => severity `info`
- else if any alert severity is `critical` => overall `critical`
- else => overall `warning`

Equivalent boolean logic:
- `overall = critical if exists(alert.severity == critical) else warning if alerts>0 else info`

## 4.4 Active signal counting
In `/api/ai/consult`, `active_signals` is built by checking non-null/non-empty signal fields.

Mathematically:
- `total_signals_active = Σ I(signal_i_present)`
where `I` is indicator function (`1` if present else `0`).

---

## 5) Backend filtering before AI consult
Before forwarding to AI service, backend applies doctor feature toggles (`filterVitalsByToggles`):

- If `ai_vitals_monitoring=false` => no vitals passed.
- Per-signal booleans decide which metrics enter AI payload.

So the effective AI input is:
- `vitals_effective = vitals_raw ∩ enabled_signal_set`

This means AI calculations operate only on enabled and available signals.

---

## 6) LLM reasoning layer (non-deterministic, clinically structured)

After deterministic alerts, AI service sends prompt to Groq/HuggingFace and requests strict JSON output with:

- alerts,
- possible conditions,
- differential diagnosis,
- suggested questions/tests,
- risk indicators,
- severity assessment,
- signal-wise interpretation.

Final response merges:
- deterministic structured alerts, plus
- AI text alerts converted to structured `AI_ALERT` entries if not duplicates.

---

## 7) Fallback behavior if FastAPI AI is unavailable

Backend fallback (Node service) performs basic checks:
- HR > 120 -> Tachycardia
- HR < 50 -> Bradycardia
- SpO2 < 92 -> Low SpO2
- fall_detected -> Fall detected

Severity fallback:
- `warning` if any fallback alert exists, else `mild`.

---

## 8) Precision and caveats

1. SpO2, pallor/Hb estimate, and skin screening are marked experimental.
2. CV outputs are **screening signals**, not definitive diagnosis.
3. Clinical confirmation with device-grade vitals/tests is required.
4. Threshold logic is deterministic and explainable; LLM layer is assistive and context-aware.

---

## 9) File map (where each calculation stage lives)

- AI service main logic: `swastik-ai-service/main.py`
- Backend AI proxy + fallback: `swastik-backend/services/consultationService.js`
- Vitals stream retrieval/summaries: `swastik-backend/services/vitalsService.js`
- Signal toggle filtering: `swastik-backend/services/featureToggleService.js`
- Doctor vitals panel display: `swastik-web/src/components/consultation/DoctorVitalsPanel.tsx`

---

## 10) Quick checklist to trace a single consultation mathematically

1. Confirm incoming patient payload values (`heart_rate`, `spo2`, `pain_score`, etc.).
2. Check Layer-1 alerts generated on WebSocket ingest.
3. Verify feature-toggle filtered payload reaching `/api/ai/consult`.
4. Recompute Layer-2 thresholds manually using values above.
5. Validate merged final alerts and `severity_assessment`.
6. Verify `total_signals_active = count(non-null enabled signal fields)`.

This is the exact end-to-end calculation path currently implemented.
