"""
HostelCare Application Backend Server
Provides REST APIs connected to MySQL Database & Serves Static Frontend
"""

import json
import os
import re
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import db

ROOT_DIR = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", 8000))

class HostelCareHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def log_message(self, format, *args):
        sys.stdout.write(f"[HTTP] {self.address_string()} - {format % args}\n")
        sys.stdout.flush()

    def send_json(self, status: int, data: object):
        body = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def parse_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        raw_body = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(raw_body)
        except Exception:
            return {}

    # ==================== GET REQUESTS ====================
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        # 1. Health & DB Status
        if path == "/api/health":
            cfg = db.load_config()
            connected, msg = db.test_connection(cfg)
            db_status = {
                "mysqlConnected": connected,
                "message": msg,
                "config": {
                    "host": cfg["host"],
                    "port": cfg["port"],
                    "user": cfg["user"],
                    "database": cfg["database"],
                    "hasPassword": bool(cfg["password"])
                }
            }
            self.send_json(HTTPStatus.OK, db_status)
            return

        # 2. Issues API
        if path == "/api/issues":
            try:
                hostel = params.get("hostel", [None])[0]
                user_id = params.get("userId", [None])[0]
                issues = db.get_all_issues(hostel=hostel, user_id=user_id)
                self.send_json(HTTPStatus.OK, issues)
            except Exception as e:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
            return

        # 3. Emails API
        if path == "/api/emails":
            try:
                emails = db.get_all_emails()
                self.send_json(HTTPStatus.OK, emails)
            except Exception as e:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
            return

        # 4. Stats API
        if path == "/api/stats":
            try:
                stats = db.get_stats()
                self.send_json(HTTPStatus.OK, stats)
            except Exception as e:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
            return

        # Serve static frontend files
        if path == "/":
            self.path = "/index.html"
        return super().do_GET()

    # ==================== POST REQUESTS ====================
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.parse_body()

        # 1. Update & Test MySQL Credentials
        if path == "/api/config/db":
            cfg = db.load_config()
            if "host" in body: cfg["host"] = body["host"]
            if "port" in body: cfg["port"] = int(body["port"])
            if "user" in body: cfg["user"] = body["user"]
            if "password" in body: cfg["password"] = body["password"]
            if "database" in body: cfg["database"] = body["database"]

            connected, msg = db.test_connection(cfg)
            if connected:
                db.save_config(cfg)
                init_ok, init_msg = db.init_database()
                self.send_json(HTTPStatus.OK, {
                    "success": True,
                    "message": "Connected to MySQL and initialized tables successfully!",
                    "initDetails": init_msg
                })
            else:
                self.send_json(HTTPStatus.BAD_REQUEST, {
                    "success": False,
                    "error": f"Failed to connect to MySQL: {msg}"
                })
            return

        # 2. Student Registration
        if path == "/api/auth/register":
            try:
                # Check duplicate
                existing = db.get_user_by_identifier(body.get("username", ""))
                if not existing and body.get("email"):
                    existing = db.get_user_by_identifier(body["email"])
                if not existing and body.get("regNo"):
                    existing = db.get_user_by_identifier(body["regNo"])

                if existing:
                    self.send_json(HTTPStatus.CONFLICT, {
                        "error": f"An account with registration number {existing.get('reg_no')} or username {existing.get('username')} already exists."
                    })
                    return

                new_user = db.create_user(body)
                self.send_json(HTTPStatus.CREATED, {
                    "success": True,
                    "user": new_user
                })
            except Exception as e:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
            return

        # 3. User Login
        if path == "/api/auth/login":
            identifier = body.get("identifier", "").strip()
            password = body.get("password", "").strip()
            try:
                user = db.get_user_by_identifier(identifier)
                if not user or user["password"] != password:
                    self.send_json(HTTPStatus.UNAUTHORIZED, {
                        "error": "Invalid username/email or password."
                    })
                    return

                # Convert to frontend user object
                user_res = {
                    "id": user["id"],
                    "name": user["name"],
                    "regNo": user["reg_no"],
                    "email": user["email"],
                    "username": user["username"],
                    "role": user["role"],
                    "hostel": user["hostel"],
                    "roomNo": user["room_no"],
                    "location": user.get("location", "")
                }
                self.send_json(HTTPStatus.OK, {"success": True, "user": user_res})
            except Exception as e:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
            return

        # 4. Create New Issue
        if path == "/api/issues":
            try:
                created = db.create_issue(body)
                self.send_json(HTTPStatus.CREATED, {"success": True, "issue": created})
            except Exception as e:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
            return

        # 5. Resolve Issue & Send Email
        resolve_match = re.match(r"^/api/issues/([^/]+)/resolve$", path)
        if resolve_match:
            issue_id = resolve_match.group(1)
            notes = body.get("resolutionNotes", "")
            resolved_by = body.get("resolvedBy", "Hostel Admin")
            email_data = body.get("emailData", {})
            try:
                db.resolve_issue_and_create_email(issue_id, notes, resolved_by, email_data)
                self.send_json(HTTPStatus.OK, {
                    "success": True,
                    "message": f"Issue #{issue_id} resolved and email dispatched."
                })
            except Exception as e:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found"})

    # ==================== PATCH REQUESTS ====================
    def do_PATCH(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.parse_body()

        issue_match = re.match(r"^/api/issues/([^/]+)$", path)
        if issue_match:
            issue_id = issue_match.group(1)
            new_status = body.get("status")
            try:
                db.update_issue_status(issue_id, new_status)
                self.send_json(HTTPStatus.OK, {
                    "success": True,
                    "message": f"Issue #{issue_id} status updated to {new_status}"
                })
            except Exception as e:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found"})

def run_server():
    # Attempt DB init
    print("=" * 60)
    print("🚀 Initializing HostelCare Backend connected to MySQL...")
    cfg = db.load_config()
    print(f"   Target: MySQL on {cfg['host']}:{cfg['port']}, Database: {cfg['database']}, User: {cfg['user']}")
    
    ok, msg = db.init_database()
    if ok:
        print("   ✅ MySQL Database & Tables Ready!")
    else:
        print(f"   ⚠️ MySQL Connection Notice: {msg}")
        print("   (You can configure/update MySQL credentials via the UI or db_config.json)")
    
    server_address = ("", PORT)
    httpd = ThreadingHTTPServer(server_address, HostelCareHandler)
    print(f"   🌐 Server running at: http://localhost:{PORT}")
    print("=" * 60)
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()
