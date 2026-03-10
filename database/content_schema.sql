-- ============================================================================
-- CzystyPlayer Content Database Schema
-- Database: czystyplayerbaza
-- Purpose: Store movies and series content from JSON files
-- ============================================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS czystyplayerbaza CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE czystyplayerbaza;

-- ============================================================================
-- MOVIES TABLES
-- ============================================================================

-- Main movies table
CREATE TABLE IF NOT EXISTS movies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    year VARCHAR(10),
    description TEXT,
    url VARCHAR(500) UNIQUE NOT NULL,
    views VARCHAR(20),
    rating DECIMAL(3,2),
    rating_count VARCHAR(20),
    total_sources INT DEFAULT 0,
    
    -- Images data (stored as JSON or separate fields)
    background_url VARCHAR(1000),
    background_local VARCHAR(500),
    poster_url VARCHAR(1000),
    poster_local VARCHAR(500),
    
    -- Poster from scraper data
    poster_scraper_original_url VARCHAR(1000),
    poster_scraper_local_path VARCHAR(500),
    poster_scraper_filename VARCHAR(500),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_title (title(255)),
    INDEX idx_year (year),
    INDEX idx_rating (rating),
    INDEX idx_views (views),
    INDEX idx_url (url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Movie video sources
CREATE TABLE IF NOT EXISTS movie_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NOT NULL,
    src VARCHAR(1000) NOT NULL,
    hosting VARCHAR(100),
    version VARCHAR(100),
    quality VARCHAR(50),
    width VARCHAR(20),
    height VARCHAR(20),
    source_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    INDEX idx_movie_id (movie_id),
    INDEX idx_hosting (hosting),
    INDEX idx_quality (quality)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Movie categories (many-to-many)
CREATE TABLE IF NOT EXISTS movie_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    INDEX idx_movie_id (movie_id),
    INDEX idx_category (category),
    UNIQUE KEY unique_movie_category (movie_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Movie countries (many-to-many)
CREATE TABLE IF NOT EXISTS movie_countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NOT NULL,
    country VARCHAR(100) NOT NULL,
    
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    INDEX idx_movie_id (movie_id),
    INDEX idx_country (country),
    UNIQUE KEY unique_movie_country (movie_id, country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Movie directors (many-to-many)
CREATE TABLE IF NOT EXISTS movie_directors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NOT NULL,
    director VARCHAR(255) NOT NULL,
    
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    INDEX idx_movie_id (movie_id),
    INDEX idx_director (director)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Movie screenplay writers (many-to-many)
CREATE TABLE IF NOT EXISTS movie_screenplay (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NOT NULL,
    writer VARCHAR(255) NOT NULL,
    
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    INDEX idx_movie_id (movie_id),
    INDEX idx_writer (writer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SERIES TABLES
-- ============================================================================

-- Main series table
CREATE TABLE IF NOT EXISTS series (
    id INT AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(500) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    original_title VARCHAR(500),
    year VARCHAR(10),
    description TEXT,
    
    -- Poster data
    poster_url VARCHAR(1000),
    poster_path VARCHAR(500),
    
    -- Background data
    background_url VARCHAR(1000),
    background_path VARCHAR(500),
    
    -- Stats
    rating DECIMAL(3,2),
    views VARCHAR(20),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_title (title(255)),
    INDEX idx_year (year),
    INDEX idx_rating (rating),
    INDEX idx_views (views),
    INDEX idx_url (url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Series seasons
CREATE TABLE IF NOT EXISTS seasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    series_id INT NOT NULL,
    season_number INT NOT NULL,
    season_title VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    INDEX idx_series_id (series_id),
    INDEX idx_season_number (season_number),
    UNIQUE KEY unique_series_season (series_id, season_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Series episodes
CREATE TABLE IF NOT EXISTS episodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    season_id INT NOT NULL,
    series_id INT NOT NULL,
    episode_title VARCHAR(500),
    episode_url VARCHAR(1000),
    is_premium BOOLEAN DEFAULT FALSE,
    season_number INT NOT NULL,
    episode_number INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    INDEX idx_season_id (season_id),
    INDEX idx_series_id (series_id),
    INDEX idx_season_number (season_number),
    INDEX idx_episode_number (episode_number),
    INDEX idx_episode_url (episode_url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Episode video sources
CREATE TABLE IF NOT EXISTS episode_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    episode_id INT NOT NULL,
    hosting VARCHAR(100),
    quality VARCHAR(50),
    uploader VARCHAR(255),
    iframe_url VARCHAR(1000) NOT NULL,
    language VARCHAR(10),
    source_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
    INDEX idx_episode_id (episode_id),
    INDEX idx_hosting (hosting),
    INDEX idx_quality (quality),
    INDEX idx_language (language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Series categories (many-to-many)
CREATE TABLE IF NOT EXISTS series_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    series_id INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    INDEX idx_series_id (series_id),
    INDEX idx_category (category),
    UNIQUE KEY unique_series_category (series_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Series countries (many-to-many)
CREATE TABLE IF NOT EXISTS series_countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    series_id INT NOT NULL,
    country VARCHAR(100) NOT NULL,
    
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    INDEX idx_series_id (series_id),
    INDEX idx_country (country),
    UNIQUE KEY unique_series_country (series_id, country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Series cast (many-to-many)
CREATE TABLE IF NOT EXISTS series_cast (
    id INT AUTO_INCREMENT PRIMARY KEY,
    series_id INT NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    INDEX idx_series_id (series_id),
    INDEX idx_actor_name (actor_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- View for movies with all related data
CREATE OR REPLACE VIEW movies_full AS
SELECT 
    m.*,
    GROUP_CONCAT(DISTINCT mc.category ORDER BY mc.category SEPARATOR ', ') as categories,
    GROUP_CONCAT(DISTINCT mco.country ORDER BY mco.country SEPARATOR ', ') as countries,
    GROUP_CONCAT(DISTINCT md.director ORDER BY md.director SEPARATOR ', ') as directors,
    GROUP_CONCAT(DISTINCT ms.writer ORDER BY ms.writer SEPARATOR ', ') as screenplay,
    COUNT(DISTINCT msrc.id) as source_count
FROM movies m
LEFT JOIN movie_categories mc ON m.id = mc.movie_id
LEFT JOIN movie_countries mco ON m.id = mco.movie_id
LEFT JOIN movie_directors md ON m.id = md.movie_id
LEFT JOIN movie_screenplay ms ON m.id = ms.movie_id
LEFT JOIN movie_sources msrc ON m.id = msrc.movie_id
GROUP BY m.id;

-- View for series with all related data
CREATE OR REPLACE VIEW series_full AS
SELECT 
    s.*,
    GROUP_CONCAT(DISTINCT sc.category ORDER BY sc.category SEPARATOR ', ') as categories,
    GROUP_CONCAT(DISTINCT sco.country ORDER BY sco.country SEPARATOR ', ') as countries,
    GROUP_CONCAT(DISTINCT scast.actor_name ORDER BY scast.actor_name SEPARATOR ', ') as cast,
    COUNT(DISTINCT seas.id) as season_count,
    COUNT(DISTINCT ep.id) as episode_count
FROM series s
LEFT JOIN series_categories sc ON s.id = sc.series_id
LEFT JOIN series_countries sco ON s.id = sco.series_id
LEFT JOIN series_cast scast ON s.id = scast.series_id
LEFT JOIN seasons seas ON s.id = seas.series_id
LEFT JOIN episodes ep ON s.id = ep.series_id
GROUP BY s.id;

-- ============================================================================
-- STATISTICS & METADATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS migration_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_type ENUM('movies', 'series') NOT NULL,
    total_records INT DEFAULT 0,
    migrated_records INT DEFAULT 0,
    failed_records INT DEFAULT 0,
    migration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    INDEX idx_migration_type (migration_type),
    INDEX idx_migration_date (migration_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INITIAL DATA VERIFICATION
-- ============================================================================

-- Show table structure summary
SELECT 'Schema created successfully. Tables created:' as Status;
SHOW TABLES;
