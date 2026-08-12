-- Schema for Web-Based Customer Satisfaction Feedback System
-- Bohol Island State University (BISU) - Calape Campus

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Feedbacks Table
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    office_visited TEXT NOT NULL,
    service_availed TEXT NOT NULL,
    client_type TEXT NOT NULL,
    sex TEXT,
    served_by TEXT,
    region_of_residence TEXT,
    
    -- Citizen's Charter (CC) Awareness
    cc1 INT DEFAULT 0,
    cc2 INT DEFAULT 0,
    cc3 INT DEFAULT 0,

    -- Dynamic Likert Scale Ratings (JSONB for flexibility)
    ratings JSONB DEFAULT '{}'::jsonb,
    
    -- Calculated mean score
    mean_score NUMERIC(5, 2),
    
    -- Additional text fields
    commendations TEXT,
    suggestions TEXT,
    type TEXT DEFAULT 'feedback'
);

-- Settings Table (for dynamic offices/dimensions)
CREATE TABLE IF NOT EXISTS admin_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_config',
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users table (maps Supabase Auth users to admin access)
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaints Table (F-AQA-CSF-004 Rev. 2)
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID REFERENCES feedbacks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Office & Personnel
    office_of TEXT,
    person_complained_of TEXT,

    -- Complainant Details (Optional for anonymity)
    name TEXT,
    address TEXT,
    sex TEXT,
    age INT,
    civil_status TEXT,
    contact_details TEXT,
    
    -- Complaint Details
    date_of_incident DATE,
    time_of_incident TEXT,
    place_of_incident TEXT,
    details_of_complaint TEXT NOT NULL,
    narrative_report TEXT NOT NULL,
    proof_of_complaint TEXT,
    attachment JSONB,
    
    -- Outcome & Legal Pledge
    desired_outcome TEXT NOT NULL,
    signature_name TEXT,
    
    -- Status tracking for Admin
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved'))
);

-- Saved QR Codes Table
CREATE TABLE IF NOT EXISTS qr_codes (
    id TEXT PRIMARY KEY,
    office TEXT NOT NULL,
    station TEXT,
    kiosk BOOLEAN DEFAULT true,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time settings for Supabase
-- If using Supabase UI, you would enable real-time replication for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE feedbacks;
ALTER PUBLICATION supabase_realtime ADD TABLE complaints;

-- Row Level Security (RLS) Policies
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read qr codes" ON qr_codes
    FOR SELECT USING (true);

CREATE POLICY "Allow public manage qr codes" ON qr_codes
    FOR ALL USING (true) WITH CHECK (true);

-- Allow anonymous inserts (public submission)
CREATE POLICY "Allow public feedback submission" ON feedbacks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public complaint submission" ON complaints
    FOR INSERT WITH CHECK (true);

-- Allow only users listed in admin_users to read protected data
CREATE POLICY "Allow admin read feedbacks" ON feedbacks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow admin update feedbacks" ON feedbacks
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    );

CREATE POLICY "Allow admin delete feedbacks" ON feedbacks
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    );

CREATE POLICY "Allow admin read complaints" ON complaints
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow admin update complaints" ON complaints
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    );

CREATE POLICY "Allow admin delete complaints" ON complaints
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    );

-- Office accounts (admin-managed)
CREATE TABLE IF NOT EXISTS office_accounts (
    id BIGSERIAL PRIMARY KEY,
    office_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE office_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin manage office accounts" ON office_accounts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    );

-- Allow everyone to read the current public form configuration
CREATE POLICY "Allow public read admin settings" ON admin_settings
    FOR SELECT USING (true);

-- Allow only admin users to update settings
CREATE POLICY "Allow admin write admin settings" ON admin_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
        )
    );

-- Users may only read their own admin mapping row
CREATE POLICY "Allow authenticated read own admin mapping" ON admin_users
    FOR SELECT USING (user_id = auth.uid());
