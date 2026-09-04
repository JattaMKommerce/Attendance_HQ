-- 07_recruitment.sql
-- Contains ATS, Job Openings, Candidates, Interviews

CREATE TABLE IF NOT EXISTS job_openings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    department_id INT,
    hiring_manager_id INT,
    employment_type ENUM('full_time', 'part_time', 'contract', 'intern') DEFAULT 'full_time',
    description TEXT,
    requirements TEXT,
    location VARCHAR(255),
    is_remote BOOLEAN DEFAULT FALSE,
    status ENUM('draft', 'published', 'closed', 'on_hold') DEFAULT 'draft',
    target_hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (hiring_manager_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    job_opening_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    source VARCHAR(100),
    status ENUM('applied', 'screening', 'shortlisted', 'interview', 'technical_round', 'hr_round', 'offer', 'hired', 'rejected') DEFAULT 'applied',
    ai_match_score DECIMAL(5, 2), -- 0 to 100
    ai_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (job_opening_id) REFERENCES job_openings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidate_resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    candidate_id INT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    parsed_text LONGTEXT,
    extracted_skills JSON,
    extracted_experience JSON,
    extracted_education JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidate_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    candidate_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS interviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    candidate_id INT NOT NULL,
    job_opening_id INT NOT NULL,
    interviewer_id INT,
    scheduled_at DATETIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    interview_type ENUM('technical', 'hr', 'culture_fit', 'screening') DEFAULT 'technical',
    status ENUM('scheduled', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    meeting_link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (job_opening_id) REFERENCES job_openings(id) ON DELETE CASCADE,
    FOREIGN KEY (interviewer_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS interview_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    interview_id INT NOT NULL,
    interviewer_id INT NOT NULL,
    rating INT CHECK(rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    strengths TEXT,
    weaknesses TEXT,
    recommendation ENUM('hire', 'strong_hire', 'no_hire', 'hold'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
    FOREIGN KEY (interviewer_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_job_openings_org_status ON job_openings(organization_id, status);
CREATE INDEX idx_candidates_org_job_status ON candidates(organization_id, job_opening_id, status);
