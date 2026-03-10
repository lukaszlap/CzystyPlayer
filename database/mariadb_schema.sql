-- ============================================================================
-- CzystyPlayer - Professional MariaDB Schema
-- Database: czystyplayer
-- Charset: utf8mb4 (full Unicode support including emojis)
-- Collation: utf8mb4_unicode_ci (case-insensitive, proper Unicode sorting)
-- ============================================================================

-- Drop database if exists (careful - only for fresh setup!)
-- DROP DATABASE IF EXISTS czystyplayer;

-- Create database with proper charset
CREATE DATABASE IF NOT EXISTS czystyplayer
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE czystyplayer;

-- ============================================================================
-- Table: users
-- Purpose: Store user accounts for authentication
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL COMMENT 'SHA-256 hash with salt (format: salt$hash)',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL DEFAULT NULL,
    
    -- Constraints
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_email (email),
    
    -- Indexes for performance
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_is_active (is_active),
    INDEX idx_last_login (last_login)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User accounts with authentication credentials';

-- ============================================================================
-- Table: user_sessions
-- Purpose: Manage active user sessions with token-based authentication
-- Relation: Many sessions per user (multi-device support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    session_token VARCHAR(512) NOT NULL COMMENT 'JWT refresh token (can be long)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL COMMENT 'Session expiration time - set explicitly on creation',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_activity TIMESTAMP NULL DEFAULT NULL COMMENT 'Track last activity for session monitoring',
    
    -- Foreign Key Constraints
    CONSTRAINT fk_session_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Constraints
    UNIQUE KEY uk_session_token (session_token),
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active),
    INDEX idx_user_active (user_id, is_active, expires_at) COMMENT 'Composite index for session validation'
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User session tokens for multi-device authentication';

-- ============================================================================
-- Table: watch_sessions
-- Purpose: Track user watch progress and history
-- Relation: Many watch sessions per user (authenticated users only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS watch_sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL COMMENT 'References users.id - all users must be authenticated',
    content_id VARCHAR(50) NOT NULL COMMENT 'Movie/Series ID from JSON files',
    content_type ENUM('movie', 'series') NOT NULL,
    season_number TINYINT UNSIGNED NULL DEFAULT NULL COMMENT 'NULL for movies, 1-99 for series',
    episode_number SMALLINT UNSIGNED NULL DEFAULT NULL COMMENT 'NULL for movies, episode number for series',
    watch_time INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Watch position in seconds',
    total_duration INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total content duration in seconds',
    watch_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Calculated percentage (0.00-100.00)',
    completed BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE when watch_percentage >= 95%',
    content_title VARCHAR(255) NULL COMMENT 'Cached title for performance',
    poster_path VARCHAR(500) NULL COMMENT 'Cached poster URL for performance',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints (only enforced when user_id is NOT NULL)
    -- Anonymous sessions have user_id = NULL, authenticated users have valid user_id
    CONSTRAINT fk_watch_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_content_id (content_id),
    INDEX idx_content_type (content_type),
    INDEX idx_completed (completed),
    INDEX idx_last_updated (last_updated),
    
    -- Composite indexes for common queries
    INDEX idx_user_content (user_id, content_id, content_type, season_number, episode_number) 
        COMMENT 'Find specific watch session for user',
    INDEX idx_user_progress (user_id, completed, last_updated) 
        COMMENT 'Get in-progress history for user',
    INDEX idx_user_series_completed (user_id, content_type, content_id, completed) 
        COMMENT 'Find completed series episodes',
    
    -- Ensure unique constraint for user+content combination
    UNIQUE KEY uk_user_watch (user_id, content_id, content_type, season_number, episode_number)
        COMMENT 'Prevent duplicate watch sessions'
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User watch progress and viewing history (authenticated users only)';

-- ============================================================================
-- Table: user_preferences
-- Purpose: Store user playback and interface preferences
-- Relation: One preference set per user (authenticated users only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL COMMENT 'References users.id - all users must be authenticated',
    preferred_quality ENUM('auto', '360p', '480p', '720p', '1080p', '4k') NOT NULL DEFAULT 'auto',
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'pl' COMMENT 'ISO 639-1 language code',
    auto_play BOOLEAN NOT NULL DEFAULT TRUE,
    preferred_sources VARCHAR(255) NOT NULL DEFAULT 'voe.sx' COMMENT 'Comma-separated list of preferred hosting sources',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_preferences_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Constraints
    UNIQUE KEY uk_user_preferences (user_id),
    
    -- Indexes for performance
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User playback and interface preferences (authenticated users only)';

-- ============================================================================
-- Table: user_my_list
-- Purpose: Store user's "My List" (watchlist) items
-- Relation: Many items per user (authenticated users only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_my_list (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL COMMENT 'References users.id',
    content_id INT UNSIGNED NOT NULL COMMENT 'Movie or Series ID from content database',
    content_type ENUM('movie', 'series') NOT NULL,
    title VARCHAR(500) NOT NULL COMMENT 'Cached title for performance',
    poster_path VARCHAR(500) NULL COMMENT 'Cached poster path',
    year VARCHAR(10) NULL,
    rating DECIMAL(3,2) NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_mylist_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Unique constraint - prevent duplicates
    UNIQUE KEY uk_user_content (user_id, content_id, content_type),
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_added_at (added_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User watchlist / My List items';

-- ============================================================================
-- Table: user_likes
-- Purpose: Store user's liked content
-- Relation: Many likes per user (authenticated users only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_likes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL COMMENT 'References users.id',
    content_id INT UNSIGNED NOT NULL COMMENT 'Movie or Series ID from content database',
    content_type ENUM('movie', 'series') NOT NULL,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_likes_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Unique constraint - prevent duplicates
    UNIQUE KEY uk_user_like (user_id, content_id, content_type),
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_liked_at (liked_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User liked content';

-- ============================================================================
-- Table: user_ai_searches
-- Purpose: Store user's AI recommendation search history
-- Relation: Many searches per user (authenticated users only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_ai_searches (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL COMMENT 'References users.id',
    query TEXT NOT NULL COMMENT 'User search query',
    content_type ENUM('movies', 'series', 'all') NOT NULL DEFAULT 'all',
    ai_message TEXT NULL COMMENT 'AI response message',
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_aisearch_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_searched_at (searched_at),
    INDEX idx_content_type (content_type)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User AI recommendation search history';

-- ============================================================================
-- Table: user_ai_recommendations
-- Purpose: Store AI-generated recommendations for each search
-- Relation: Many recommendations per search
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_ai_recommendations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    search_id INT UNSIGNED NOT NULL COMMENT 'References user_ai_searches.id',
    user_id INT UNSIGNED NOT NULL COMMENT 'References users.id (denormalized for performance)',
    content_id INT UNSIGNED NOT NULL COMMENT 'Movie or Series ID from content database',
    content_type ENUM('movie', 'series') NOT NULL,
    title VARCHAR(500) NOT NULL COMMENT 'Cached title',
    poster_path VARCHAR(500) NULL COMMENT 'Cached poster path',
    year VARCHAR(10) NULL,
    rating DECIMAL(3,2) NULL,
    categories VARCHAR(500) NULL COMMENT 'Cached categories',
    match_score INT UNSIGNED NULL COMMENT 'AI match score 0-100',
    match_reason TEXT NULL COMMENT 'AI explanation for recommendation',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_airec_search 
        FOREIGN KEY (search_id) 
        REFERENCES user_ai_searches(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_airec_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Indexes for performance
    INDEX idx_search_id (search_id),
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_match_score (match_score)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='AI-generated content recommendations';

-- ============================================================================
-- Views for simplified queries (optional but recommended)
-- ============================================================================

-- Active users with valid sessions
CREATE OR REPLACE VIEW active_users AS
SELECT DISTINCT
    u.id,
    u.username,
    u.email,
    u.last_login,
    COUNT(DISTINCT us.id) as active_session_count
FROM users u
INNER JOIN user_sessions us ON u.id = us.user_id
WHERE u.is_active = TRUE
  AND us.is_active = TRUE
  AND us.expires_at > NOW()
GROUP BY u.id, u.username, u.email, u.last_login;

-- Watch history summary per user
CREATE OR REPLACE VIEW user_watch_summary AS
SELECT 
    u.username,
    ws.user_id,
    COUNT(*) as total_watches,
    COUNT(CASE WHEN ws.completed = TRUE THEN 1 END) as completed_count,
    COUNT(CASE WHEN ws.completed = FALSE THEN 1 END) as in_progress_count,
    COUNT(CASE WHEN ws.content_type = 'movie' THEN 1 END) as movies_count,
    COUNT(CASE WHEN ws.content_type = 'series' THEN 1 END) as series_count,
    MAX(ws.last_updated) as last_activity
FROM watch_sessions ws
INNER JOIN users u ON ws.user_id = u.id
GROUP BY ws.user_id, u.username;

-- User My List summary
CREATE OR REPLACE VIEW user_mylist_summary AS
SELECT 
    u.username,
    uml.user_id,
    COUNT(*) as total_items,
    COUNT(CASE WHEN uml.content_type = 'movie' THEN 1 END) as movies_count,
    COUNT(CASE WHEN uml.content_type = 'series' THEN 1 END) as series_count,
    MAX(uml.added_at) as last_added
FROM user_my_list uml
INNER JOIN users u ON uml.user_id = u.id
GROUP BY uml.user_id, u.username;

-- User AI Recommendations summary
CREATE OR REPLACE VIEW user_ai_summary AS
SELECT 
    u.username,
    uas.user_id,
    COUNT(DISTINCT uas.id) as total_searches,
    COUNT(uar.id) as total_recommendations,
    MAX(uas.searched_at) as last_search
FROM user_ai_searches uas
INNER JOIN users u ON uas.user_id = u.id
LEFT JOIN user_ai_recommendations uar ON uas.id = uar.search_id
GROUP BY uas.user_id, u.username;

-- ============================================================================
-- Stored Procedures for common operations (optional - advanced)
-- ============================================================================

DELIMITER //

-- Clean up expired sessions (call periodically via cron or app)
CREATE PROCEDURE IF NOT EXISTS cleanup_expired_sessions()
BEGIN
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    SELECT ROW_COUNT() as deactivated_sessions;
END //

-- Get user watch statistics
CREATE PROCEDURE IF NOT EXISTS get_user_stats(IN p_user_id INT UNSIGNED)
BEGIN
    SELECT 
        COUNT(*) as total_watches,
        SUM(CASE WHEN completed = TRUE THEN 1 ELSE 0 END) as completed_watches,
        SUM(CASE WHEN content_type = 'movie' THEN 1 ELSE 0 END) as movies_watched,
        SUM(CASE WHEN content_type = 'series' THEN 1 ELSE 0 END) as episodes_watched,
        SUM(watch_time) as total_watch_time_seconds,
        MAX(last_updated) as last_watch_date
    FROM watch_sessions
    WHERE user_id = p_user_id;
END //

DELIMITER ;

-- ============================================================================
-- Initial setup completed
-- ============================================================================

-- Display table information
SELECT 
    TABLE_NAME,
    ENGINE,
    TABLE_ROWS,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS 'Size_MB',
    TABLE_COLLATION,
    TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'czystyplayer'
ORDER BY TABLE_NAME;
