-- Add Firebase auth support to student and teacher tables
ALTER TABLE student ADD COLUMN firebase_uid VARCHAR(128) UNIQUE DEFAULT NULL AFTER id;
ALTER TABLE student ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER email;

ALTER TABLE teacher ADD COLUMN firebase_uid VARCHAR(128) UNIQUE DEFAULT NULL AFTER id;
ALTER TABLE teacher ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER email;
