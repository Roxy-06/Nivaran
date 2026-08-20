# app/database.py
import os
import sqlite3
import json
import uuid
from datetime import datetime
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
        reportedAt TEXT
    )
    """)
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

# Initialize SQLite database schema and seed data
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
    def __init__(self, query=None):
        self.query = query or {}
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
            
        sql = f"SELECT * FROM issues{where_str}{order_str} LIMIT ?"
        params.append(limit)
        
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for row in rows:
            doc = dict(row)
            if doc.get("location"):
                doc["location"] = json.loads(doc["location"])
            if doc.get("areaImpact"):
                doc["areaImpact"] = json.loads(doc["areaImpact"])
            if doc.get("reportedAt"):
                rep_at = doc["reportedAt"]
                if isinstance(rep_at, str):
                    try:
                        doc["reportedAt"] = datetime.fromisoformat(rep_at)
                    except ValueError:
                        pass
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
            if doc.get("location"):
                doc["location"] = json.loads(doc["location"])
            if doc.get("areaImpact"):
                doc["areaImpact"] = json.loads(doc["areaImpact"])
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
        
        loc = json.dumps(doc.get("location"))
        area = json.dumps(doc.get("areaImpact"))
        rep_at = doc.get("reportedAt")
        if isinstance(rep_at, datetime):
            rep_at = rep_at.isoformat()
            
        cursor.execute(
            """
            INSERT INTO issues (_id, serial, message, location, areaImpact, media, status, department, priority, confidence, reportedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                doc["_id"],
                doc.get("serial"),
                doc.get("message"),
                loc,
                area,
                doc.get("media"),
                doc.get("status"),
                doc.get("department"),
                doc.get("priority"),
                doc.get("confidence"),
                rep_at
            )
        )
        conn.commit()
        conn.close()

    def find(self, query=None):
        return FindCursor(query)

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

# Collections
issues_collection = IssuesCollection()
users_collection = UsersCollection()
