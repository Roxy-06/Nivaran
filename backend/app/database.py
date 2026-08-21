# app/database.py
import os
import sqlite3
import json
import uuid
from datetime import datetime, timezone
from app.auth import pwd_context


# Set up SQLite database file paths
DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "db"))
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "nivaran.db")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        _id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT,
        department TEXT
    )
    """)
    
    # Create issues table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS issues (
        _id TEXT PRIMARY KEY,
        serial TEXT UNIQUE,
        message TEXT,
        location TEXT,
        areaImpact TEXT,
        media TEXT,
        status TEXT,
        department TEXT,
        priority TEXT,
        confidence REAL,
        reportedAt TEXT,
        voice_audio TEXT,
        detected_language TEXT,
        transcript TEXT,
        translation TEXT,
        structured_entities TEXT,
        completeness_score INTEGER,
        clarification_history TEXT,
        is_duplicate INTEGER DEFAULT 0,
        duplicate_of_serial TEXT,
        cluster_id TEXT,
        relationship_score REAL,
        ai_recommendation TEXT,
        override_reason TEXT,
        embedding TEXT,
        rating INTEGER,
        citizen_feedback TEXT
    )
    """)

    # Create issue_clusters table (Macro Issues)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS issue_clusters (
        cluster_id TEXT PRIMARY KEY,
        title TEXT,
        department TEXT,
        priority TEXT,
        status TEXT,
        centroid_lat REAL,
        centroid_lon REAL,
        radius_meters REAL,
        complaint_count INTEGER,
        first_reported_at TEXT,
        last_reported_at TEXT,
        growth_rate_pct REAL,
        why_grouped TEXT,
        complaint_serials TEXT,
        updated_at TEXT
    )
    """)

    # Create audit_logs table (Officer actions & AI recommendations)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT,
        action TEXT,
        target_serial TEXT,
        previous_val TEXT,
        new_val TEXT,
        rationale TEXT,
        created_at TEXT
    )
    """)

    # Auto-migration for existing SQLite databases
    cursor.execute("PRAGMA table_info(issues)")
    existing_cols = [col[1] for col in cursor.fetchall()]
    new_cols = [
        ("voice_audio", "TEXT"),
        ("detected_language", "TEXT"),
        ("transcript", "TEXT"),
        ("translation", "TEXT"),
        ("structured_entities", "TEXT"),
        ("completeness_score", "INTEGER"),
        ("clarification_history", "TEXT"),
        ("is_duplicate", "INTEGER DEFAULT 0"),
        ("duplicate_of_serial", "TEXT"),
        ("cluster_id", "TEXT"),
        ("relationship_score", "REAL"),
        ("ai_recommendation", "TEXT"),
        ("override_reason", "TEXT"),
        ("embedding", "TEXT"),
        ("rating", "INTEGER"),
        ("citizen_feedback", "TEXT")
    ]
    for col_name, col_type in new_cols:
        if col_name.split()[0] not in existing_cols:
            cursor.execute(f"ALTER TABLE issues ADD COLUMN {col_name} {col_type}")

    conn.commit()
    
    # Seed default users
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        default_users = [
            {
                "_id": str(uuid.uuid4()),
                "email": "admin@nivaran.in",
                "password": pwd_context.hash("admin123"),
                "role": "admin",
                "department": None
            },
            {
                "_id": str(uuid.uuid4()),
                "email": "electricity@nivaran.in",
                "password": pwd_context.hash("department123"),
                "role": "department_user",
                "department": "Electricity Board"
            },
            {
                "_id": str(uuid.uuid4()),
                "email": "municipality@nivaran.in",
                "password": pwd_context.hash("department123"),
                "role": "department_user",
                "department": "Municipality"
            },
            {
                "_id": str(uuid.uuid4()),
                "email": "roads@nivaran.in",
                "password": pwd_context.hash("department123"),
                "role": "department_user",
                "department": "Roads Department"
            },
            {
                "_id": str(uuid.uuid4()),
                "email": "water@nivaran.in",
                "password": pwd_context.hash("department123"),
                "role": "department_user",
                "department": "Water Board"
            },
            {
                "_id": str(uuid.uuid4()),
                "email": "safety@nivaran.in",
                "password": pwd_context.hash("department123"),
                "role": "department_user",
                "department": "Public Safety"
            }
        ]
        for u in default_users:
            cursor.execute(
                "INSERT INTO users (_id, email, password, role, department) VALUES (?, ?, ?, ?, ?)",
                (u["_id"], u["email"], u["password"], u["role"], u["department"])
            )
        conn.commit()
    conn.close()


init_db()


class UsersCollection:
    async def find_one(self, query):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        where_clauses = []
        params = []
        for k, v in query.items():
            where_clauses.append(f"{k} = ?")
            params.append(v)
        
        where_str = " AND ".join(where_clauses)
        cursor.execute(f"SELECT * FROM users WHERE {where_str}", params)
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None


class FindCursor:
    def __init__(self, query=None, table="issues"):
        self.query = query or {}
        self.table = table
        self.sort_field = None
        self.sort_order = 1

    def sort(self, field, order=1):
        self.sort_field = field
        self.sort_order = order
        return self

    async def to_list(self, limit=1000):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        where_clauses = []
        params = []
        for k, v in self.query.items():
            where_clauses.append(f"{k} = ?")
            params.append(v)
            
        where_str = ""
        if where_clauses:
            where_str = " WHERE " + " AND ".join(where_clauses)
            
        order_str = ""
        if self.sort_field:
            col = self.sort_field
            direction = "ASC" if self.sort_order == 1 else "DESC"
            order_str = f" ORDER BY {col} {direction}"
            
        sql = f"SELECT * FROM {self.table}{where_str}{order_str} LIMIT ?"
        params.append(limit)
        
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for row in rows:
            doc = dict(row)
            if self.table == "issues":
                for json_field in ["location", "areaImpact", "structured_entities", "clarification_history", "ai_recommendation"]:
                    if doc.get(json_field) and isinstance(doc[json_field], str):
                        try:
                            doc[json_field] = json.loads(doc[json_field])
                        except Exception:
                            pass
                if doc.get("embedding") and isinstance(doc["embedding"], str):
                    try:
                        doc["embedding"] = json.loads(doc["embedding"])
                    except Exception:
                        pass
                if doc.get("reportedAt"):
                    rep_at = doc["reportedAt"]
                    if isinstance(rep_at, str):
                        try:
                            doc["reportedAt"] = datetime.fromisoformat(rep_at)
                        except ValueError:
                            pass
            elif self.table == "issue_clusters":
                if doc.get("complaint_serials") and isinstance(doc["complaint_serials"], str):
                    try:
                        doc["complaint_serials"] = json.loads(doc["complaint_serials"])
                    except Exception:
                        doc["complaint_serials"] = [s.strip() for s in doc["complaint_serials"].split(",") if s.strip()]
            results.append(doc)
            
        return results


class IssuesCollection:
    async def find_one(self, query):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        where_clauses = []
        params = []
        for k, v in query.items():
            where_clauses.append(f"{k} = ?")
            params.append(v)
            
        where_str = " AND ".join(where_clauses)
        cursor.execute(f"SELECT * FROM issues WHERE {where_str}", params)
        row = cursor.fetchone()
        conn.close()
        
        if row:
            doc = dict(row)
            for json_field in ["location", "areaImpact", "structured_entities", "clarification_history", "ai_recommendation"]:
                if doc.get(json_field) and isinstance(doc[json_field], str):
                    try:
                        doc[json_field] = json.loads(doc[json_field])
                    except Exception:
                        pass
            if doc.get("embedding") and isinstance(doc["embedding"], str):
                try:
                    doc["embedding"] = json.loads(doc["embedding"])
                except Exception:
                    pass
            if doc.get("reportedAt"):
                rep_at = doc["reportedAt"]
                if isinstance(rep_at, str):
                    try:
                        doc["reportedAt"] = datetime.fromisoformat(rep_at)
                    except ValueError:
                        pass
            return doc
        return None

    async def insert_one(self, doc):
        if "_id" not in doc:
            doc["_id"] = str(uuid.uuid4())
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        loc = json.dumps(doc.get("location")) if doc.get("location") is not None else None
        area = json.dumps(doc.get("areaImpact")) if doc.get("areaImpact") is not None else None
        struct = json.dumps(doc.get("structured_entities")) if doc.get("structured_entities") is not None else None
        clarif = json.dumps(doc.get("clarification_history")) if doc.get("clarification_history") is not None else None
        ai_rec = json.dumps(doc.get("ai_recommendation")) if doc.get("ai_recommendation") is not None else None
        emb = json.dumps(doc.get("embedding")) if doc.get("embedding") is not None else None

        rep_at = doc.get("reportedAt")
        if isinstance(rep_at, datetime):
            rep_at = rep_at.isoformat()
            
        cursor.execute(
            """
            INSERT INTO issues (
                _id, serial, message, location, areaImpact, media, status, department, priority,
                confidence, reportedAt, voice_audio, detected_language, transcript, translation,
                structured_entities, completeness_score, clarification_history, is_duplicate,
                duplicate_of_serial, cluster_id, relationship_score, ai_recommendation, override_reason, embedding
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                doc["_id"],
                doc.get("serial"),
                doc.get("message"),
                loc,
                area,
                doc.get("media"),
                doc.get("status", "Reported"),
                doc.get("department"),
                doc.get("priority"),
                doc.get("confidence"),
                rep_at,
                doc.get("voice_audio"),
                doc.get("detected_language"),
                doc.get("transcript"),
                doc.get("translation"),
                struct,
                doc.get("completeness_score", 80),
                clarif,
                1 if doc.get("is_duplicate") else 0,
                doc.get("duplicate_of_serial"),
                doc.get("cluster_id"),
                doc.get("relationship_score", 0.0),
                ai_rec,
                doc.get("override_reason"),
                emb
            )
        )
        conn.commit()
        conn.close()

    def find(self, query=None):
        return FindCursor(query, table="issues")

    async def update_one(self, query, update):
        set_dict = update.get("$set", {})
        if not set_dict:
            class MockUpdateResult:
                matched_count = 0
            return MockUpdateResult()
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        set_clauses = []
        set_params = []
        for k, v in set_dict.items():
            if isinstance(v, (dict, list)):
                v = json.dumps(v)
            set_clauses.append(f"{k} = ?")
            set_params.append(v)
            
        where_clauses = []
        where_params = []
        for k, v in query.items():
            where_clauses.append(f"{k} = ?")
            where_params.append(v)
            
        set_str = ", ".join(set_clauses)
        where_str = " AND ".join(where_clauses)
        
        sql = f"UPDATE issues SET {set_str} WHERE {where_str}"
        cursor.execute(sql, set_params + where_params)
        conn.commit()
        
        rowcount = cursor.rowcount
        conn.close()
        
        class UpdateResult:
            matched_count = rowcount
            
        return UpdateResult()

    async def delete_all(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM issues")
        conn.commit()
        conn.close()


class IssueClustersCollection:
    async def find_one(self, query):
        conn = get_db_connection()
        cursor = conn.cursor()
        where_clauses = [f"{k} = ?" for k in query.keys()]
        params = list(query.values())
        where_str = " AND ".join(where_clauses)
        cursor.execute(f"SELECT * FROM issue_clusters WHERE {where_str}", params)
        row = cursor.fetchone()
        conn.close()
        if row:
            doc = dict(row)
            if doc.get("complaint_serials"):
                try:
                    doc["complaint_serials"] = json.loads(doc["complaint_serials"])
                except Exception:
                    doc["complaint_serials"] = [s.strip() for s in doc["complaint_serials"].split(",") if s.strip()]
            return doc
        return None

    def find(self, query=None):
        return FindCursor(query, table="issue_clusters")

    async def insert_or_update(self, cluster_doc):
        conn = get_db_connection()
        cursor = conn.cursor()
        c_id = cluster_doc["cluster_id"]
        serials_json = json.dumps(cluster_doc.get("complaint_serials", []))
        
        cursor.execute("SELECT cluster_id FROM issue_clusters WHERE cluster_id = ?", (c_id,))
        exists = cursor.fetchone() is not None

        if exists:
            cursor.execute(
                """
                UPDATE issue_clusters SET
                    title = ?, department = ?, priority = ?, status = ?, centroid_lat = ?, centroid_lon = ?,
                    radius_meters = ?, complaint_count = ?, first_reported_at = ?, last_reported_at = ?,
                    growth_rate_pct = ?, why_grouped = ?, complaint_serials = ?, updated_at = ?
                WHERE cluster_id = ?
                """,
                (
                    cluster_doc.get("title"),
                    cluster_doc.get("department"),
                    cluster_doc.get("priority"),
                    cluster_doc.get("status"),
                    cluster_doc.get("centroid_lat"),
                    cluster_doc.get("centroid_lon"),
                    cluster_doc.get("radius_meters"),
                    cluster_doc.get("complaint_count"),
                    cluster_doc.get("first_reported_at"),
                    cluster_doc.get("last_reported_at"),
                    cluster_doc.get("growth_rate_pct"),
                    cluster_doc.get("why_grouped"),
                    serials_json,
                    cluster_doc.get("updated_at"),
                    c_id
                )
            )
        else:
            cursor.execute(
                """
                INSERT INTO issue_clusters (
                    cluster_id, title, department, priority, status, centroid_lat, centroid_lon,
                    radius_meters, complaint_count, first_reported_at, last_reported_at, growth_rate_pct,
                    why_grouped, complaint_serials, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    c_id,
                    cluster_doc.get("title"),
                    cluster_doc.get("department"),
                    cluster_doc.get("priority"),
                    cluster_doc.get("status", "Reported"),
                    cluster_doc.get("centroid_lat"),
                    cluster_doc.get("centroid_lon"),
                    cluster_doc.get("radius_meters"),
                    cluster_doc.get("complaint_count", 1),
                    cluster_doc.get("first_reported_at"),
                    cluster_doc.get("last_reported_at"),
                    cluster_doc.get("growth_rate_pct", 0.0),
                    cluster_doc.get("why_grouped"),
                    serials_json,
                    cluster_doc.get("updated_at")
                )
            )
        conn.commit()
        conn.close()

    async def update_one(self, query, update):
        set_dict = update.get("$set", {})
        if not set_dict:
            class MockUpdateResult:
                matched_count = 0
            return MockUpdateResult()
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        set_clauses = []
        set_params = []
        for k, v in set_dict.items():
            if isinstance(v, (dict, list)):
                v = json.dumps(v)
            set_clauses.append(f"{k} = ?")
            set_params.append(v)
            
        where_clauses = [f"{k} = ?" for k in query.keys()]
        where_params = list(query.values())
        
        set_str = ", ".join(set_clauses)
        where_str = " AND ".join(where_clauses)
        
        sql = f"UPDATE issue_clusters SET {set_str} WHERE {where_str}"
        cursor.execute(sql, set_params + where_params)
        conn.commit()
        rowcount = cursor.rowcount
        conn.close()
        
        class UpdateResult:
            matched_count = rowcount
        return UpdateResult()

    async def delete_all(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM issue_clusters")
        conn.commit()
        conn.close()


class AuditLogsCollection:
    async def insert_one(self, log_doc):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO audit_logs (user_email, action, target_serial, previous_val, new_val, rationale, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                log_doc.get("user_email"),
                log_doc.get("action"),
                log_doc.get("target_serial"),
                log_doc.get("previous_val"),
                log_doc.get("new_val"),
                log_doc.get("rationale"),
                log_doc.get("created_at") or log_doc.get("timestamp") or datetime.now(timezone.utc).isoformat()
            )
        )
        conn.commit()
        conn.close()
        return log_doc

    def find(self, query=None):
        return FindCursor(query, table="audit_logs")


# Instantiate Collections
issues_collection = IssuesCollection()
users_collection = UsersCollection()
clusters_collection = IssueClustersCollection()
audit_logs_collection = AuditLogsCollection()
