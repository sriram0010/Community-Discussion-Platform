"""
HostelCare Database Module - MySQL Connection & Operations
Uses PyMySQL with automatic schema initialization and retry logic.
"""

import json
import os
import pymysql
from pymysql.constants import CLIENT
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
CONFIG_FILE = BASE_DIR / "db_config.json"
SCHEMA_FILE = BASE_DIR / "schema.sql"

from urllib.parse import urlparse, parse_qs
import ssl as py_ssl

DEFAULT_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "hostelcare",
    "ssl": False
}

def parse_database_url(url_str):
    """Parses a mysql:// connection string into config dict."""
    try:
        parsed = urlparse(url_str)
        config = {
            "host": parsed.hostname or "localhost",
            "port": parsed.port or 3306,
            "user": parsed.username or "root",
            "password": parsed.password or "",
            "database": parsed.path.lstrip("/") or "hostelcare",
            "ssl": True
        }
        return config
    except Exception as e:
        print(f"[DB] Error parsing DATABASE_URL: {e}")
        return {}

def load_config():
    config = DEFAULT_CONFIG.copy()
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                config.update(saved)
        except Exception as e:
            print(f"[DB] Error reading config file: {e}")

    # Check for complete DATABASE_URL or MYSQL_URL
    db_url = os.environ.get("DATABASE_URL") or os.environ.get("MYSQL_URL")
    if db_url:
        parsed_cfg = parse_database_url(db_url)
        config.update(parsed_cfg)

    # Environment variable individual overrides
    if os.environ.get("MYSQL_HOST"):
        config["host"] = os.environ["MYSQL_HOST"]
    if os.environ.get("MYSQL_PORT"):
        config["port"] = int(os.environ["MYSQL_PORT"])
    if os.environ.get("MYSQL_USER"):
        config["user"] = os.environ["MYSQL_USER"]
    if os.environ.get("MYSQL_PASSWORD") is not None:
        config["password"] = os.environ["MYSQL_PASSWORD"]
    if os.environ.get("MYSQL_DATABASE"):
        config["database"] = os.environ["MYSQL_DATABASE"]
    if os.environ.get("MYSQL_SSL"):
        config["ssl"] = os.environ["MYSQL_SSL"].lower() in ("true", "1", "yes")

    # Auto-enable SSL for known cloud hosts
    host_lower = config["host"].lower()
    if any(cloud in host_lower for cloud in ["tidbcloud.com", "aivencloud.com", "clever-cloud.com", "planetscale.com"]) or config["port"] == 4000:
        config["ssl"] = True

    return config

def save_config(new_config):
    config = load_config()
    config.update(new_config)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
    return config

def get_connection(include_db=True):
    config = load_config()
    kwargs = {
        "host": config["host"],
        "port": int(config["port"]),
        "user": config["user"],
        "password": config["password"],
        "charset": "utf8mb4",
        "cursorclass": pymysql.cursors.DictCursor,
        "client_flag": CLIENT.MULTI_STATEMENTS,
        "connect_timeout": 6
    }
    if include_db:
        kwargs["database"] = config["database"]

    if config.get("ssl"):
        ssl_ctx = py_ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = py_ssl.CERT_NONE
        kwargs["ssl"] = ssl_ctx

    return pymysql.connect(**kwargs)

def test_connection(config_to_test=None):
    cfg = config_to_test if config_to_test else load_config()
    try:
        kwargs = {
            "host": cfg["host"],
            "port": int(cfg["port"]),
            "user": cfg["user"],
            "password": cfg["password"],
            "charset": "utf8mb4",
            "connect_timeout": 6
        }
        if cfg.get("ssl") or any(cloud in cfg["host"].lower() for cloud in ["tidbcloud.com", "aivencloud.com", "clever-cloud.com"]) or cfg.get("port") == 4000:
            ssl_ctx = py_ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = py_ssl.CERT_NONE
            kwargs["ssl"] = ssl_ctx

        conn = pymysql.connect(**kwargs)
        conn.close()
        return True, "Connected successfully to MySQL server."
    except Exception as e:
        return False, str(e)

def init_database():
    """Initializes hostelcare database and runs schema.sql."""
    config = load_config()
    try:
        # Step 1: Connect without DB to create database if missing
        conn = get_connection(include_db=False)
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{config['database']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        conn.commit()
        conn.close()

        # Step 2: Connect to DB and run schema.sql
        conn = get_connection(include_db=True)
        if SCHEMA_FILE.exists():
            with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
                sql_script = f.read()
            with conn.cursor() as cur:
                cur.execute(sql_script)
            conn.commit()
        conn.close()
        print(f"[DB] Initialized database '{config['database']}' successfully.")
        return True, "Database initialized successfully."
    except Exception as e:
        err_msg = f"Failed to initialize database: {e}"
        print(f"[DB ERROR] {err_msg}")
        return False, err_msg

# ==================== DATA ACCESS METHODS ====================

def get_user_by_id(user_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cur.fetchone()
    finally:
        conn.close()

def get_user_by_identifier(identifier):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM users WHERE LOWER(username) = LOWER(%s) OR LOWER(email) = LOWER(%s) OR LOWER(reg_no) = LOWER(%s)",
                (identifier, identifier, identifier)
            )
            return cur.fetchone()
    finally:
        conn.close()

def create_user(user_data):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (id, name, reg_no, email, username, password, role, hostel, room_no, location)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_data["id"],
                user_data["name"],
                user_data["regNo"],
                user_data["email"],
                user_data["username"],
                user_data["password"],
                user_data.get("role", "student"),
                user_data["hostel"],
                user_data["roomNo"],
                user_data.get("location", "")
            ))
        conn.commit()
        return get_user_by_id(user_data["id"])
    finally:
        conn.close()

def get_all_issues(hostel=None, user_id=None):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            query = "SELECT * FROM issues WHERE 1=1"
            params = []
            if hostel and hostel != "ALL":
                query += " AND LOWER(hostel) = LOWER(%s)"
                params.append(hostel)
            if user_id:
                query += " AND (user_id = %s OR reg_no = %s)"
                params.extend([user_id, user_id])
            query += " ORDER BY created_at DESC"
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            # Convert datetime objects to ISO strings for frontend JSON
            for r in rows:
                if r.get("created_at"):
                    r["createdAt"] = r["created_at"].isoformat()
                if r.get("updated_at"):
                    r["updatedAt"] = r["updated_at"].isoformat()
                if r.get("resolved_at"):
                    r["resolvedAt"] = r["resolved_at"].isoformat()
                r["studentName"] = r.get("student_name")
                r["studentEmail"] = r.get("student_email")
                r["regNo"] = r.get("reg_no")
                r["roomNo"] = r.get("room_no")
                r["resolutionNotes"] = r.get("resolution_notes")
                r["resolvedBy"] = r.get("resolved_by")
            return rows
    finally:
        conn.close()

def create_issue(data):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO issues (id, user_id, student_name, reg_no, student_email, hostel, room_no, category, title, description, priority, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data["id"],
                data["userId"],
                data["studentName"],
                data["regNo"],
                data["studentEmail"],
                data["hostel"],
                data["roomNo"],
                data["category"],
                data["title"],
                data["description"],
                data.get("priority", "Normal"),
                data.get("status", "Pending")
            ))
        conn.commit()
        return data
    finally:
        conn.close()

def update_issue_status(issue_id, new_status):
    allowed_statuses = {"Pending", "In Progress", "Resolved"}
    if new_status not in allowed_statuses:
        raise ValueError("Invalid issue status.")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE issues SET status = %s WHERE id = %s", (new_status, issue_id))
            if cur.rowcount == 0:
                raise ValueError("Issue not found.")
        conn.commit()
        return True
    finally:
        conn.close()

def resolve_issue_and_create_email(issue_id, resolution_notes, resolved_by, email_data):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # 1. Update Issue
            cur.execute("""
                UPDATE issues 
                SET status = 'Resolved',
                    resolved_at = NOW(),
                    resolved_by = %s,
                    resolution_notes = %s
                WHERE id = %s
            """, (resolved_by, resolution_notes, issue_id))
            if cur.rowcount == 0:
                raise ValueError("Issue not found.")

            # 2. Insert Email Log
            cur.execute("""
                INSERT INTO emails (id, issue_id, recipient_email, recipient_name, reg_no, hostel, room_no, category, subject, body, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                email_data["id"],
                issue_id,
                email_data["recipientEmail"],
                email_data["recipientName"],
                email_data["regNo"],
                email_data["hostel"],
                email_data["roomNo"],
                email_data["category"],
                email_data["subject"],
                email_data["body"],
                # Keep this value safely within the existing VARCHAR(50) column
                # even if a caller supplies an unexpected status string.
                str(email_data.get("status", "Delivered"))[:50]
            ))
        conn.commit()
        return True
    finally:
        conn.close()

def get_all_emails():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM emails ORDER BY sent_at DESC")
            rows = cur.fetchall()
            for r in rows:
                if r.get("sent_at"):
                    r["sentAt"] = r["sent_at"].isoformat()
                r["issueId"] = r.get("issue_id")
                r["recipientEmail"] = r.get("recipient_email")
                r["recipientName"] = r.get("recipient_name")
                r["regNo"] = r.get("reg_no")
                r["roomNo"] = r.get("room_no")
            return rows
    finally:
        conn.close()

def get_stats():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Overall counts
            cur.execute("SELECT status, COUNT(*) as cnt FROM issues GROUP BY status")
            status_counts = {r["status"]: r["cnt"] for r in cur.fetchall()}

            # Counts by hostel
            cur.execute("""
                SELECT hostel, 
                       SUM(CASE WHEN status != 'Resolved' THEN 1 ELSE 0 END) as active_cnt,
                       SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved_cnt
                FROM issues 
                GROUP BY hostel
            """)
            hostel_stats = cur.fetchall()

            # Counts by category
            cur.execute("SELECT category, COUNT(*) as cnt FROM issues GROUP BY category")
            category_stats = cur.fetchall()

            return {
                "statusCounts": status_counts,
                "hostelStats": hostel_stats,
                "categoryStats": category_stats
            }
    finally:
        conn.close()
