INSERT INTO roles (role) VALUES ('default')
ON CONFLICT (role) DO NOTHING;
