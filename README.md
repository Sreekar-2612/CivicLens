# QuickSort — Public Works Transparency & Coordination Engine

> **A Civic-Tech Infrastructure Operating System** connecting municipal departments, contractors, independent auditors, and residents into a unified spatial registry to align excavation schedules, eliminate repeat road-cutting, and hold urban projects accountable.

---
https://drive.google.com/drive/folders/1l-S2fltxIizjVaD4MMN-VhFk1RzX-4Vw?usp=sharing

## Table of Contents

1. [The Problem: Why QuickSort Exists](#1-the-problem-why-quicksort-exists)
2. [Our Solution & Core Philosophy](#2-our-solution--core-philosophy)
3. [System Architecture](#3-system-architecture)
4. [Roles & User Journeys](#4-roles--user-journeys)
5. [Key Engines & Business Logic](#5-key-engines--business-logic)
   - [Proactive Clash Detection Engine](#proactive-clash-detection-engine)
   - [Repeat Digging Moratorium (365-Day Window)](#repeat-digging-moratorium-365-day-window)
   - [Department Grading & Scorecard Algorithm](#department-grading--scorecard-algorithm)
   - [Contractor Standing & Ward Disruption Indices](#contractor-standing--ward-disruption-indices)
6. [Database Schema & Data Model](#6-database-schema--data-model)
   - [Core Tables](#core-tables)
   - [Contractor & Audit Workflow Tables](#contractor--audit-workflow-tables)
   - [Notifications & Audit Logging](#notifications--audit-logging)
   - [Storage Bucket Architecture](#storage-bucket-architecture)
7. [Frontend & Visual Design System](#7-frontend--visual-design-system)
8. [Local Development & Setup](#8-local-development--setup)
9. [Automated Testing & Quality Verification](#9-automated-testing--quality-verification)
10. [Security & Access Control (RLS)](#10-security--access-control-rls)

---

## 1. The Problem: Why QuickSort Exists

In growing metropolitan cities, urban infrastructure delivery suffers from a chronic structural breakdown known as **Uncoordinated Subsurface Digging**:

1. **The Pave-and-Dig Cycle**: The Public Works Department (PWD) completes a multi-crore road resurfacing project. Less than three weeks later, the Water Supply Department trenches the newly laid asphalt to replace cast-iron mains. A month later, an Electrical or Telecom utility cuts across the same corridor to lay fiber-optic or high-voltage cables.
2. **Public Fund Wastage**: Tens of crores in municipal road budgets are destroyed every financial year due to premature road destruction before asphalt has even settled.
3. **Severe Civilian Impact**: Open ditches, loose aggregate, and uncoordinated lane blockages lead to vehicular accidents, traffic bottlenecks, dust pollution, and business disruption.
4. **Information Asymmetry**: Municipal agencies operate in organizational silos without visibility into adjacent departments' work calendars, while citizens have zero transparency into who is digging, why work is stalled, or when restoration will finish.

---

## 2. Our Solution & Core Philosophy

**QuickSort** replaces departmental blindspots with a **Unified Spatial & Temporal Infrastructure Registry**:

* **Live Digital Work Orders**: Every excavation, road paving, and utility pipeline project is registered with precise GIS coordinates, corridor boundaries, contractors, budgets, and verified completion dates.
* **Proactive Clash Detection**: When two separate agencies plan excavations on the same corridor within conflicting timeframes or within 365 days of road paving, the system automatically triggers a high-severity coordination alert and notifies department heads.
* **Ground-Reality Citizen Evidence**: Residents report stalled digging, safety hazards, and abandoned trenches with authentic geotagged photo evidence directly linked to municipal work orders.
* **Independent Milestone Verification**: Contractor progress claims require third-party engineering audit sign-offs before milestones are marked complete and payments are cleared.
* **Strict Anti-Slop Integrity**: All data shown across the application comes exclusively from the active database. No synthetic mock descriptions or recursive placeholders are permitted.

---

## 3. System Architecture

QuickSort is built as a cloud-native, high-performance web platform:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATION                            │
│           React 19 • TypeScript • Vite • Tailwind CSS • Lucide         │
│     Canvas WebGL Particles • Global Map Canvas • 3D Depth Carousel     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                       Supabase Client / REST API
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    SERVERLESS EDGE FUNCTIONS (Deno)                    │
│   ├── get-projects / get-project-detail                                │
│   ├── get-departments                                                  │
│   ├── get-grievances / create-grievance                                │
│   ├── get-clashes                                                      │
│   ├── get-workspace / assign-contractor                                │
│   └── admin-users                                                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                SQL Engine
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       POSTGRESQL DATABASE (Supabase)                   │
│   ├── Tables: projects, departments, grievances, clashes, milestones   │
│   ├── RLS: Role-Based Row Level Security (resident/officer/admin)      │
│   ├── Triggers: Spatial & Temporal Clash Detection, Notifications      │
│   └── Storage: 'evidence-photos' bucket with signed & public URLs      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Roles & User Journeys

The platform supports four specialized user personas:

### 1. Citizen / Resident
* **Explore Corridors**: Browse active municipal work permits via interactive search, ward filters, or GIS map view.
* **Inspect Ground Evidence**: View authentic resident-uploaded photos showing active road status, verified contractors, and progress metrics.
* **Lodge Civic Grievances**: File reports (`/report`) on potholes, stalled digging, missing barricades, or water leakage with photo uploads.
* **Track Resolution Lifecycle**: Monitor progress using unique tracking IDs (`GRV-2026-XXXXXXXX`) through four stages: `Submitted` → `Acknowledged` → `Investigating` → `Resolved`.

### 2. Municipal Department Officer
* **Permit Registration**: Register scheduled works with original deadlines, budgets, and contractor allocations.
* **Coordination Inbox**: Review automated clash alerts when another agency schedules excavations on the same corridor.
* **Grievance Triage**: Inspect citizen complaints, upload official responses, and dispatch contractor teams for remediation.
* **Deadline Auditing**: Log verified milestone progress or formal deadline revision reasons with mandatory delay justifications.

### 3. Contractor
* **Assigned Works Dashboard**: View awarded corridors, contractual milestones, and linked resident complaints.
* **Work Progress Submissions**: Submit percentage completion milestones with mandatory on-site evidence photos for auditor review.

### 4. Quality Auditor & City Administrator
* **Third-Party Review**: Inspect contractor submissions, examine evidence photos, and approve or reject milestone completions.
* **Supervision & Governance**: Reassign department portfolios, manage contractor credentials, inspect immutable audit trails, and review city-wide delivery scorecards.

---

## 5. Key Engines & Business Logic

### Proactive Clash Detection Engine
The clash engine runs inside PostgreSQL triggers and client heuristics whenever a project is created or updated:

1. **Spatial Proximity Check**:
   * Exact street matching: `LOWER(project_a.road_name) = LOWER(project_b.road_name)`
   * Geo-distance matching: Euclidean/Haversine distance $\le 200\text{ meters}$.
2. **Temporal Overlap Matrix**:
   * Detects concurrent active dates between `[start_date, end_date]` of both agencies.
3. **Repeat Digging Moratorium (365-Day Window)**:
   * If Department A completes `road_resurfacing` or `road_construction`, a **365-day excavation freeze** is enforced.
   * If Department B (Water, Electric, Telecom, Gas) schedules trenching on that corridor within 365 days of resurfacing, the system flags a **Critical Digging Moratorium Breach** (Clash Score $\ge 80$).

### Department Grading & Scorecard Algorithm
Municipal agencies receive delivery grades calculated directly from live database metrics:

$$\text{On-Time Rate} = \frac{\text{Total Projects} - \text{Delayed Projects}}{\text{Total Projects}} \times 100$$

$$\text{Conflict Score} = \sum \text{Clash Alert Scores for Department Corridors}$$

| Grade | Criteria |
| :--- | :--- |
| **A+** | $\text{On-Time Rate} \ge 90\%$ and $\le 1$ minor conflict alert |
| **A** | $\text{On-Time Rate} \ge 75\%$ |
| **B** | $\text{On-Time Rate} \ge 60\%$ |
| **C** | $\text{On-Time Rate} \ge 45\%$ |
| **D** | $\text{On-Time Rate} < 45\%$ or multiple chronic unmitigated clashes |

### Interactive Hover Dossiers
Scorecard cards feature responsive hover expansion drawers revealing real database records:
* **Active Corridors**: Lists exact project titles, contractors, and live progress percentages.
* **Citizen Grievance Feed**: Lists submitted resident complaints filed for that agency's corridors.
* **Conflict Alerts**: Displays active spatial overlap clashes with severity scores.

---

## 6. Database Schema & Data Model

QuickSort uses a relational schema with foreign key constraints, checks, and spatial indices:

### Core Tables

#### `public.departments`
* `id` (TEXT, PK): Unique code (`dept-pwd`, `dept-water`, `dept-electric`, `dept-telecom`, `dept-drain`, `dept-gas`).
* `name` (TEXT): Full municipal department name.
* `short_name` (TEXT): Abbreviation (`PWD`, `WSD`, `ELEC`, `TELE`, `DRN`, `GAS`).
* `color` (TEXT): Department brand hex color.
* `contact_email`, `contact_phone` (TEXT): Officer contact channels.

#### `public.projects`
* `id` (TEXT, PK): Identifier (`proj-0001` or generated `proj-xxxxxxxx`).
* `title` (TEXT): Official public works title.
* `purpose` (TEXT): Scope of work and engineering objective.
* `department_id` (TEXT, FK): References `departments(id)`.
* `contractor_name` (TEXT): Awarded construction agency.
* `category` (TEXT): `road_construction`, `road_resurfacing`, `water_pipeline`, `drainage`, `electricity`, `telecom`, `gas_pipeline`, etc.
* `road_name`, `locality`, `ward` (TEXT): Geographic corridor identifiers.
* `latitude`, `longitude` (DOUBLE PRECISION): GIS point coordinates.
* `budget` (NUMERIC): Sanctioned capital expenditure in Lakhs.
* `status` (TEXT): `planned`, `in_progress`, `delayed`, `completed`, `cancelled`.
* `start_date`, `original_end_date`, `revised_end_date`, `actual_end_date` (DATE).
* `progress_percent` (INTEGER): 0 to 100.
* `confidence_indicator` (TEXT): `on_track`, `at_risk`, `delayed`.
* `latest_delay_reason` (TEXT): Mandatory audit explanation for overdue deadlines.

#### `public.grievances`
* `id` (TEXT, PK): Unique report identifier.
* `reference_id` (TEXT, UNIQUE): Citizen tracking code (`GRV-2026-XXXXXXXX`).
* `project_id` (TEXT, FK): Optional link to `projects(id)`.
* `category` (TEXT): `delay`, `safety`, `quality`, `traffic`, `noise`, `unauthorized_digging`, `other`.
* `title`, `description` (TEXT): Citizen grievance statement.
* `road_name`, `locality`, `ward` (TEXT): Location of reported defect.
* `reporter_name`, `reporter_contact` (TEXT): Submitting resident details.
* `status` (TEXT): `submitted`, `acknowledged`, `investigating`, `resolved`, `rejected`.
* `officer_response` (TEXT): Remediation notes provided by assigned municipal officer.
* `evidence_url` (TEXT): Storage path for resident-uploaded photographic evidence.

#### `public.clashes`
* `id` (TEXT, PK): Conflict identifier.
* `project_a_id`, `project_b_id` (TEXT, FK): The two conflicting work orders.
* `severity` (TEXT): `low`, `medium`, `high`, `critical`.
* `score` (INTEGER): Calculated clash index (0–100).
* `status` (TEXT): `detected`, `acknowledged`, `resolved`, `dismissed`.
* `reasons` (TEXT[]): List of detected conflicts (e.g., *Spatial overlap*, *Moratorium violation*).

### Contractor & Audit Workflow Tables
* `public.contractors`: Registered engineering agencies with credibility ratings.
* `public.project_assignments`: Maps contractors and independent auditors to projects.
* `public.task_submissions`: Work milestone submissions with progress evidence photos.
* `public.task_reviews`: Auditor approvals or rejections with engineering audit comments.

### Storage Bucket: `evidence-photos`
* Public read access enabled for transparent viewing of resident complaints and verified work photos.
* Authenticated write access for signed-in residents, contractors, and municipal officers.
* Full public URL structure:  
  `https://<project-ref>.supabase.co/storage/v1/object/public/evidence-photos/<path>`

---

## 7. Frontend & Visual Design System

The interface is built around a warm, civic-tech design system:

* **Curated Palette**:
  * Deep Obsidian: `#021217`
  * Warm Cream & Beige: `#f1f3d8`, `#FAF7F0`, `#F3EBDD`
  * Champagne Sand: `#e2c09c`
  * Vibrant Signal Green: `#11e852`, `#088c2e`
  * Alert Crimson: `#ff0000`, `#c40000`
* **Global Map & WebGL Background**: Continuous spider-web city cartography rendered via GPU-accelerated lightweight particle lines that respond to mouse motion.
* **3D Depth Carousel**: Coverflow presentation featuring smooth inertia interpolation (lerp), step snapping, and hover zoom.
* **Zero Layout Shift (CLS)**: Skeletons and responsive image loaders ensure instant page rendering.

---

## 8. Local Development & Setup

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Sreekar-2612/CivicLens.git
   cd CivicLens
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://xrpqgszwigdrcwbkpdtt.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 9. Automated Testing & Quality Verification

QuickSort includes an automated Vitest test suite covering core domain logic:

```bash
# Run the test suite
npm test

# Run production build validation
npm run build

# Run linting
npm run lint
```

### Verified Test Suites
* **`clashEngine.test.ts`**: Verifies 200m spatial proximity, temporal overlap, and 365-day moratorium rules.
* **`projectValidation.test.ts`**: Verifies date constraints, mandatory delay explanations, and progress bounds.
* **`roadRisk.test.ts`**: Validates corridor risk scoring and repeated digging flags.
* **`adminService.test.ts` & `adminAccess.test.tsx`**: Tests administrative role enforcement and workspace access guards.
* **`workflowService.test.ts`**: Verifies contractor submissions and auditor review pipelines.

---

## 10. Security & Access Control (RLS)

All database access is guarded by **Row Level Security (RLS)** in PostgreSQL:

1. **Public/Anonymous Access**:
   * `SELECT` on published projects, departments, approved milestones, and public evidence photos.
   * `INSERT` on grievances (allows anonymous civic issue filing with tracking code).
2. **Authenticated Residents**:
   * View own submitted grievances and track review status.
   * Upload photographic evidence into `evidence-photos/grievances/<uid>/`.
3. **Department Officers**:
   * `UPDATE` restricted strictly to projects belonging to the officer's assigned `department_id`.
   * Cannot tamper with another department's work orders or dates.
4. **Contractors & Auditors**:
   * Access scoped strictly to records present in `project_assignments`.
5. **Administrators**:
   * Full oversight with audit logs recorded in `public.audit_logs`.

---

## License

Developed under the **MIT License**. Engineered for transparent, accountable, and citizen-first urban governance.
