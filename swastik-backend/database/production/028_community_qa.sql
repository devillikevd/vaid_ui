-- Community Q&A Tables

-- 1. Questions Table
CREATE TABLE IF NOT EXISTS community_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    upvotes INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Answers Table
CREATE TABLE IF NOT EXISTS community_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES community_questions(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_doctor_verified BOOLEAN DEFAULT FALSE,
    upvotes INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT author_check CHECK (
        (doctor_id IS NOT NULL AND patient_id IS NULL) OR 
        (patient_id IS NOT NULL AND doctor_id IS NULL)
    )
);

-- Indexes for fast querying
CREATE INDEX idx_community_questions_patient ON community_questions(patient_id);
CREATE INDEX idx_community_answers_question ON community_answers(question_id);
CREATE INDEX idx_community_answers_doctor ON community_answers(doctor_id);

-- RLS Policies
ALTER TABLE community_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions" 
    ON community_questions FOR SELECT 
    USING (true);

CREATE POLICY "Patients can insert questions" 
    ON community_questions FOR INSERT 
    WITH CHECK (auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id));

CREATE POLICY "Anyone can read answers" 
    ON community_answers FOR SELECT 
    USING (true);

CREATE POLICY "Doctors can insert answers" 
    ON community_answers FOR INSERT 
    WITH CHECK (auth.uid() IN (SELECT user_id FROM doctors WHERE id = doctor_id));

CREATE POLICY "Patients can insert answers" 
    ON community_answers FOR INSERT 
    WITH CHECK (auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id));
