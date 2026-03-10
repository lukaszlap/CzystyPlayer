#!/usr/bin/env python3
"""
CzystyPlayer Database Migration Script
Purpose: Add user_my_list, user_likes, user_ai_searches, user_ai_recommendations tables
Database: czystyplayer (user database)

Usage:
    python migrate_user_lists.py

Requirements:
    pip install mysql-connector-python python-dotenv

Environment variables (from .env.local):
    DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE
"""

import os
import sys
from datetime import datetime

try:
    import mysql.connector
    from mysql.connector import Error
except ImportError:
    print("Error: mysql-connector-python not installed")
    print("Run: pip install mysql-connector-python")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("Warning: python-dotenv not installed, using environment variables directly")
    load_dotenv = None


def load_env():
    """Load environment variables from .env.local"""
    if load_dotenv:
        # Try to load from .env.local first, then .env
        env_local = os.path.join(os.path.dirname(__file__), '..', '.env.local')
        env_file = os.path.join(os.path.dirname(__file__), '..', '.env')
        
        if os.path.exists(env_local):
            load_dotenv(env_local)
            print(f"✓ Loaded environment from .env.local")
        elif os.path.exists(env_file):
            load_dotenv(env_file)
            print(f"✓ Loaded environment from .env")
        else:
            print("Warning: No .env file found, using system environment variables")


def get_db_config():
    """Get database configuration from environment"""
    return {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'database': os.getenv('DB_DATABASE', 'czystyplayer'),
        'charset': 'utf8mb4',
        'collation': 'utf8mb4_unicode_ci'
    }


# SQL statements for creating tables
SQL_CREATE_USER_MY_LIST = """
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
    
    CONSTRAINT fk_mylist_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    UNIQUE KEY uk_user_content (user_id, content_id, content_type),
    
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_added_at (added_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User watchlist / My List items';
"""

SQL_CREATE_USER_LIKES = """
CREATE TABLE IF NOT EXISTS user_likes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL COMMENT 'References users.id',
    content_id INT UNSIGNED NOT NULL COMMENT 'Movie or Series ID from content database',
    content_type ENUM('movie', 'series') NOT NULL,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_likes_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    UNIQUE KEY uk_user_like (user_id, content_id, content_type),
    
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_liked_at (liked_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User liked content';
"""

SQL_CREATE_USER_AI_SEARCHES = """
CREATE TABLE IF NOT EXISTS user_ai_searches (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL COMMENT 'References users.id',
    query TEXT NOT NULL COMMENT 'User search query',
    content_type ENUM('movies', 'series', 'all') NOT NULL DEFAULT 'all',
    ai_message TEXT NULL COMMENT 'AI response message',
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_aisearch_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_searched_at (searched_at),
    INDEX idx_content_type (content_type)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User AI recommendation search history';
"""

SQL_CREATE_USER_AI_RECOMMENDATIONS = """
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
    
    INDEX idx_search_id (search_id),
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_match_score (match_score)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='AI-generated content recommendations';
"""

# Views for simplified queries
SQL_CREATE_VIEW_MYLIST_SUMMARY = """
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
"""

SQL_CREATE_VIEW_AI_SUMMARY = """
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
"""


def check_table_exists(cursor, table_name):
    """Check if a table already exists"""
    cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
    return cursor.fetchone() is not None


def run_migration():
    """Run the database migration"""
    load_env()
    config = get_db_config()
    
    print("\n" + "=" * 60)
    print("CzystyPlayer - User Lists & AI Recommendations Migration")
    print("=" * 60)
    print(f"Database: {config['database']}@{config['host']}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60 + "\n")
    
    try:
        # Connect to database
        print("Connecting to database...")
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        print("✓ Connected successfully\n")
        
        # Check if users table exists
        if not check_table_exists(cursor, 'users'):
            print("✗ Error: 'users' table does not exist!")
            print("  Please run the main mariadb_schema.sql first.")
            return False
        
        migrations = [
            ("user_my_list", SQL_CREATE_USER_MY_LIST, "User My List table"),
            ("user_likes", SQL_CREATE_USER_LIKES, "User Likes table"),
            ("user_ai_searches", SQL_CREATE_USER_AI_SEARCHES, "User AI Searches table"),
            ("user_ai_recommendations", SQL_CREATE_USER_AI_RECOMMENDATIONS, "User AI Recommendations table"),
        ]
        
        views = [
            ("user_mylist_summary", SQL_CREATE_VIEW_MYLIST_SUMMARY, "My List summary view"),
            ("user_ai_summary", SQL_CREATE_VIEW_AI_SUMMARY, "AI summary view"),
        ]
        
        # Create tables
        print("Creating tables...")
        for table_name, sql, description in migrations:
            exists = check_table_exists(cursor, table_name)
            if exists:
                print(f"  ○ {description} - already exists, skipping")
            else:
                cursor.execute(sql)
                print(f"  ✓ {description} - created")
        
        conn.commit()
        print()
        
        # Create views
        print("Creating views...")
        for view_name, sql, description in views:
            try:
                cursor.execute(sql)
                print(f"  ✓ {description} - created/updated")
            except Error as e:
                print(f"  ✗ {description} - error: {e}")
        
        conn.commit()
        print()
        
        # Show table info
        print("Verifying tables...")
        cursor.execute("""
            SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = %s
            AND TABLE_NAME IN ('user_my_list', 'user_likes', 'user_ai_searches', 'user_ai_recommendations')
            ORDER BY TABLE_NAME
        """, (config['database'],))
        
        tables = cursor.fetchall()
        print("\n  Table Name                  | Rows | Comment")
        print("  " + "-" * 70)
        for table in tables:
            print(f"  {table[0]:<28} | {table[1] or 0:>4} | {table[2][:35] if table[2] else 'N/A'}")
        
        print("\n" + "=" * 60)
        print("✓ Migration completed successfully!")
        print("=" * 60)
        
        cursor.close()
        conn.close()
        return True
        
    except Error as e:
        print(f"\n✗ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return False


def rollback_migration():
    """Rollback the migration (drop created tables)"""
    load_env()
    config = get_db_config()
    
    print("\n" + "=" * 60)
    print("CzystyPlayer - ROLLBACK Migration")
    print("=" * 60)
    print("WARNING: This will DELETE all user lists and AI recommendations data!")
    print("=" * 60 + "\n")
    
    confirm = input("Are you sure? Type 'YES' to confirm: ")
    if confirm != 'YES':
        print("Rollback cancelled.")
        return False
    
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        # Drop in reverse order (due to foreign keys)
        tables_to_drop = [
            'user_ai_recommendations',
            'user_ai_searches', 
            'user_likes',
            'user_my_list'
        ]
        
        views_to_drop = [
            'user_mylist_summary',
            'user_ai_summary'
        ]
        
        print("Dropping views...")
        for view in views_to_drop:
            try:
                cursor.execute(f"DROP VIEW IF EXISTS {view}")
                print(f"  ✓ Dropped view: {view}")
            except Error as e:
                print(f"  ✗ Error dropping {view}: {e}")
        
        print("\nDropping tables...")
        for table in tables_to_drop:
            try:
                cursor.execute(f"DROP TABLE IF EXISTS {table}")
                print(f"  ✓ Dropped table: {table}")
            except Error as e:
                print(f"  ✗ Error dropping {table}: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n✓ Rollback completed!")
        return True
        
    except Error as e:
        print(f"\n✗ Database error: {e}")
        return False


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--rollback':
        success = rollback_migration()
    else:
        success = run_migration()
    
    sys.exit(0 if success else 1)
