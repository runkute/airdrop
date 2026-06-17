-- ============================================================
-- AI Marketing OS - PostgreSQL Initialization Script
-- ============================================================
-- This script runs once when the PostgreSQL container is first
-- created. It sets up extensions and baseline configuration.

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create a read-only role for analytics/reporting queries
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'readonly') THEN
        CREATE ROLE readonly;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE ai_marketing_os TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;

-- Notify
DO $$ BEGIN
    RAISE NOTICE 'AI Marketing OS database initialized successfully.';
END $$;
