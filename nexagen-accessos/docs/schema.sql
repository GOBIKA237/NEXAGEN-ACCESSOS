-- AccessOS shared schema — lock this on Day 1. Any change needs a team ping.

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45)
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,   -- e.g. 'view_finance_dashboard'
    description TEXT
);

CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE access_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    requested_role_id INTEGER REFERENCES roles(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending | approved | denied
    requested_at TIMESTAMP DEFAULT NOW(),
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,     -- e.g. 'ACCESS_GRANTED', 'ROLE_UPDATED'
    resource VARCHAR(100),            -- e.g. 'finance_dashboard'
    ip_address VARCHAR(45),
    device_info TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE login_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    device_fingerprint VARCHAR(255),
    risk_score INTEGER DEFAULT 0,     -- written by the rules engine
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed a few starter roles/permissions so everyone has the same base data
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access'),
    ('finance', 'Finance team access'),
    ('hr', 'HR team access'),
    ('employee', 'Base employee access');

INSERT INTO permissions (name, description) VALUES
    ('view_finance_dashboard', 'View finance records'),
    ('view_hr_dashboard', 'View HR records'),
    ('manage_users', 'Create/update/delete users and roles'),
    ('view_audit_log', 'View system audit log');
