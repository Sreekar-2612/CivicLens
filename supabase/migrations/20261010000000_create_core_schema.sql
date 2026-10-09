-- ============================================================
-- CivicLens Stage 1 Database Migration
-- Version: 20261010000000_create_core_schema.sql
-- Description: Core tables (departments, projects, project_updates, profiles),
--              immutability constraints, automated audit triggers, and RLS policies.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    department_type TEXT NOT NULL DEFAULT 'municipal',
    color TEXT NOT NULL DEFAULT '#3b82f6',
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Profiles Table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('resident', 'department_officer', 'contractor', 'admin')),
    department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY DEFAULT ('proj-' || substr(md5(random()::text), 1, 8)),
    title TEXT NOT NULL,
    purpose TEXT NOT NULL,
    department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    contractor_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (
        category IN (
            'road_construction', 'road_resurfacing', 'water_pipeline',
            'drainage', 'electricity', 'telecom', 'gas_pipeline',
            'bridge', 'footpath', 'other'
        )
    ),
    road_name TEXT NOT NULL,
    locality TEXT NOT NULL,
    ward TEXT NOT NULL DEFAULT 'Ward 1',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    budget NUMERIC(14, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (
        status IN ('planned', 'in_progress', 'delayed', 'completed', 'cancelled')
    ),
    publication_status TEXT NOT NULL DEFAULT 'published' CHECK (
        publication_status IN ('draft', 'published', 'archived')
    ),
    start_date DATE NOT NULL,
    original_end_date DATE NOT NULL,
    revised_end_date DATE,
    actual_end_date DATE,
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    confidence_indicator TEXT NOT NULL DEFAULT 'on_track' CHECK (
        confidence_indicator IN ('on_track', 'at_risk', 'delayed')
    ),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Constraint: deadline cannot be before start date
    CONSTRAINT check_original_end_after_start CHECK (original_end_date >= start_date),
    CONSTRAINT check_revised_end_after_start CHECK (revised_end_date IS NULL OR revised_end_date >= start_date)
);

-- 4. Project Updates / Deadline Revision Audit Trail
CREATE TABLE IF NOT EXISTS public.project_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    update_type TEXT NOT NULL DEFAULT 'progress' CHECK (
        update_type IN ('progress', 'deadline_revision', 'status_change', 'milestone', 'evidence', 'note')
    ),
    progress_percent INTEGER CHECK (progress_percent BETWEEN 0 AND 100),
    status TEXT CHECK (
        status IS NULL OR status IN ('planned', 'in_progress', 'delayed', 'completed', 'cancelled')
    ),
    notes TEXT NOT NULL,
    delay_reason_code TEXT,
    delay_reason_description TEXT,
    previous_end_date DATE,
    revised_end_date DATE,
    evidence_path TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT NOT NULL DEFAULT 'System / Authorized User',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- Indexes for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_department ON public.projects(department_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_publication_status ON public.projects(publication_status);
CREATE INDEX IF NOT EXISTS idx_projects_road_name ON public.projects(road_name);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON public.projects(start_date, original_end_date);
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON public.project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_created_at ON public.project_updates(created_at DESC);

-- ============================================================
-- Database Functions & Triggers
-- ============================================================

-- Function 1: Ensure original_end_date is strictly IMMUTABLE during updates
CREATE OR REPLACE FUNCTION public.enforce_original_end_date_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.original_end_date IS DISTINCT FROM NEW.original_end_date THEN
        RAISE EXCEPTION 'original_end_date is immutable once created. Submit a revised_end_date with an audit reason instead.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_immutable_deadline ON public.projects;
CREATE TRIGGER trg_enforce_immutable_deadline
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_original_end_date_immutability();

-- Function 2: Automated timestamp update
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function 3: Automated deadline revision history logging
-- Whenever revised_end_date changes, automatically enforce and insert a project_update record
CREATE OR REPLACE FUNCTION public.log_deadline_revision_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.revised_end_date IS DISTINCT FROM NEW.revised_end_date AND NEW.revised_end_date IS NOT NULL THEN
        INSERT INTO public.project_updates (
            project_id,
            update_type,
            progress_percent,
            status,
            notes,
            previous_end_date,
            revised_end_date,
            created_by,
            created_by_name
        ) VALUES (
            NEW.id,
            'deadline_revision',
            NEW.progress_percent,
            NEW.status,
            'Deadline adjusted to ' || NEW.revised_end_date::text,
            COALESCE(OLD.revised_end_date, OLD.original_end_date),
            NEW.revised_end_date,
            auth.uid(),
            COALESCE((SELECT display_name FROM public.profiles WHERE id = auth.uid()), 'Authorized Officer')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_deadline_revision ON public.projects;
CREATE TRIGGER trg_log_deadline_revision
AFTER UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.log_deadline_revision_audit();

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

-- Departments RLS:
-- Everyone (including public anon) can view departments
CREATE POLICY "Public read departments"
    ON public.departments FOR SELECT
    TO public
    USING (true);

-- Only admins can modify departments
CREATE POLICY "Admin manage departments"
    ON public.departments FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Profiles RLS:
-- Users can view their own profile, or admins can view all
CREATE POLICY "Users read own profile or admin all"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Projects RLS:
-- 1. Public (anonymous + authenticated) can view published projects
CREATE POLICY "Public read published projects"
    ON public.projects FOR SELECT
    TO public
    USING (publication_status = 'published');

-- 2. Authenticated officers can view draft/archived projects in their department; admins view all
CREATE POLICY "Authorized internal project view"
    ON public.projects FOR SELECT
    TO authenticated
    USING (
        publication_status = 'published'
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.role = 'admin' OR (p.role = 'department_officer' AND p.department_id = projects.department_id))
        )
    );

-- 3. Officers can insert projects for their department, Admins can insert any
CREATE POLICY "Officers and admins insert projects"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.role = 'admin' OR (p.role = 'department_officer' AND p.department_id = department_id))
        )
    );

-- 4. Officers can update their department's projects, Admins can update any
CREATE POLICY "Officers and admins update projects"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.role = 'admin' OR (p.role = 'department_officer' AND p.department_id = projects.department_id))
        )
    );

-- Project Updates RLS:
-- 1. Anyone can view updates for published projects
CREATE POLICY "Public read project updates"
    ON public.project_updates FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.projects pr
            WHERE pr.id = project_updates.project_id
            AND pr.publication_status = 'published'
        )
    );

-- 2. Officers, contractors, and admins can insert updates
CREATE POLICY "Authorized roles insert updates"
    ON public.project_updates FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.projects pr ON pr.id = project_id
            WHERE p.id = auth.uid()
            AND (
                p.role = 'admin'
                OR (p.role = 'department_officer' AND p.department_id = pr.department_id)
                OR (p.role = 'contractor' AND pr.contractor_name ILIKE ('%' || p.display_name || '%'))
            )
        )
    );
