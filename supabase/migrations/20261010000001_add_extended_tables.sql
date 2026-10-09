-- ============================================================
-- CivicLens Stage 2 Migration: Extended System Tables
-- Version: 20261010000001_add_extended_tables.sql
-- Description: Adds contractors, clashes, grievances, contractor_evaluations, and audit_logs tables.
-- ============================================================

-- 1. Contractors Table
CREATE TABLE IF NOT EXISTS public.contractors (
    id TEXT PRIMARY KEY DEFAULT ('cont-' || substr(md5(random()::text), 1, 8)),
    company_name TEXT NOT NULL UNIQUE,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    rating NUMERIC(3, 2) DEFAULT 4.0 CHECK (rating BETWEEN 0 AND 5),
    active_projects_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Clashes Table (Inter-Departmental Conflict Detection & Joint Resolutions)
CREATE TABLE IF NOT EXISTS public.clashes (
    id TEXT PRIMARY KEY DEFAULT ('clash-' || substr(md5(random()::text), 1, 8)),
    title TEXT NOT NULL,
    road_name TEXT NOT NULL,
    project_a_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    project_b_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    department_a_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
    department_b_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
    conflict_type TEXT NOT NULL CHECK (
        conflict_type IN ('trenching_sequence', 'simultaneous_digging', 'traffic_blockade', 'overlapping_dates')
    ),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    ),
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
        status IN ('pending_review', 'resolved', 'ignored', 'escalated')
    ),
    suggested_resolution TEXT,
    joint_inspection_date DATE,
    decision_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Grievances Table (Citizen Reports & Public Complaints)
CREATE TABLE IF NOT EXISTS public.grievances (
    id TEXT PRIMARY KEY DEFAULT ('rep-' || substr(md5(random()::text), 1, 8)),
    reference_id TEXT UNIQUE NOT NULL,
    project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (
        category IN ('delay', 'safety', 'quality', 'traffic', 'noise', 'unauthorized_digging', 'other')
    ),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    road_name TEXT NOT NULL,
    locality TEXT NOT NULL,
    ward TEXT NOT NULL DEFAULT 'Ward 1',
    reporter_name TEXT NOT NULL DEFAULT 'Anonymous Resident',
    reporter_contact TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (
        status IN ('submitted', 'acknowledged', 'investigating', 'resolved', 'rejected')
    ),
    officer_response TEXT,
    upvotes INTEGER NOT NULL DEFAULT 0,
    evidence_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Contractor Evaluations Table
CREATE TABLE IF NOT EXISTS public.contractor_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_name TEXT NOT NULL,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    quality_score NUMERIC(3, 2) CHECK (quality_score BETWEEN 0 AND 5),
    timeliness_score NUMERIC(3, 2) CHECK (timeliness_score BETWEEN 0 AND 5),
    safety_score NUMERIC(3, 2) CHECK (safety_score BETWEEN 0 AND 5),
    cooperation_score NUMERIC(3, 2) CHECK (cooperation_score BETWEEN 0 AND 5),
    overall_rating NUMERIC(3, 2) CHECK (overall_rating BETWEEN 0 AND 5),
    comments TEXT,
    evaluated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL DEFAULT 'System / User',
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for Query Performance
CREATE INDEX IF NOT EXISTS idx_clashes_status ON public.clashes(status);
CREATE INDEX IF NOT EXISTS idx_clashes_projects ON public.clashes(project_a_id, project_b_id);
CREATE INDEX IF NOT EXISTS idx_grievances_project ON public.grievances(project_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON public.grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_ref ON public.grievances(reference_id);
CREATE INDEX IF NOT EXISTS idx_contractor_evaluations_name ON public.contractor_evaluations(contractor_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS for all newly created tables
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read contractors" ON public.contractors FOR SELECT TO public USING (true);
CREATE POLICY "Public read clashes" ON public.clashes FOR SELECT TO public USING (true);
CREATE POLICY "Public read grievances" ON public.grievances FOR SELECT TO public USING (true);
CREATE POLICY "Public insert grievances" ON public.grievances FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public read evaluations" ON public.contractor_evaluations FOR SELECT TO public USING (true);
CREATE POLICY "Public read audit_logs" ON public.audit_logs FOR SELECT TO public USING (true);
