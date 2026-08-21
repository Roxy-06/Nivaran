"""
Standalone Seeding Script for Nivaran Civic AI Platform.
Populates realistic multilingual civic grievances and macro clusters in Salt Lake (Bidhannagar), Kolkata
for live presentation and hackathon jury demonstrations.

Usage:
    python seed_data.py
"""

import os
import sys
import json
import sqlite3
import random
from datetime import datetime, timedelta, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.auth import hash_password
from app.similarity import generate_embedding
from app.database import DB_PATH


def reset_and_init_db():
    print(f"[*] Resetting database at: {DB_PATH}")
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception as e:
            print(f"[!] Warning deleting db file: {e}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT
    );
    """)

    # 2. Issues Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS issues (
        _id TEXT PRIMARY KEY,
        serial TEXT UNIQUE NOT NULL,
        message TEXT NOT NULL,
        location TEXT,
        areaImpact TEXT,
        media TEXT,
        status TEXT DEFAULT 'Reported',
        department TEXT,
        priority TEXT,
        confidence REAL,
        reportedAt TEXT,
        voice_audio TEXT,
        detected_language TEXT,
        transcript TEXT,
        translation TEXT,
        structured_entities TEXT,
        completeness_score INTEGER DEFAULT 80,
        clarification_history TEXT,
        is_duplicate INTEGER DEFAULT 0,
        duplicate_of_serial TEXT,
        cluster_id TEXT,
        relationship_score REAL DEFAULT 0.0,
        ai_recommendation TEXT,
        override_reason TEXT,
        embedding TEXT
    );
    """)

    # 3. Issue Clusters Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS issue_clusters (
        cluster_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT DEFAULT 'Reported',
        centroid_lat REAL,
        centroid_lon REAL,
        radius_meters REAL,
        complaint_count INTEGER DEFAULT 1,
        growth_rate_pct REAL DEFAULT 0.0,
        why_grouped TEXT,
        first_reported_at TEXT,
        last_reported_at TEXT,
        updated_at TEXT,
        complaint_serials TEXT,
        cluster_embedding TEXT
    );
    """)

    # 4. Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        action TEXT NOT NULL,
        target_serial TEXT,
        previous_val TEXT,
        new_val TEXT,
        rationale TEXT,
        created_at TEXT
    );
    """)

    conn.commit()
    conn.close()
    print("[+] Database schema successfully created.")


def seed_users():
    print("[*] Seeding official officer & admin accounts...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    default_users = [
        ("admin@nivaran.in", hash_password("admin123"), "admin", None),
        ("water@nivaran.in", hash_password("department123"), "department_user", "Water Board"),
        ("electricity@nivaran.in", hash_password("department123"), "department_user", "Electricity Board"),
        ("roads@nivaran.in", hash_password("department123"), "department_user", "Roads Department"),
        ("municipality@nivaran.in", hash_password("department123"), "department_user", "Municipality"),
        ("safety@nivaran.in", hash_password("department123"), "department_user", "Public Safety"),
    ]

    for email, pwd, role, dept in default_users:
        cursor.execute("INSERT OR REPLACE INTO users (email, password, role, department) VALUES (?, ?, ?, ?)",
                       (email, pwd, role, dept))

    conn.commit()
    conn.close()
    print("[+] 6 Officer and Admin accounts seeded.")


# -------------------------------------------------------------
# REALISTIC SALT LAKE (BIDHANNAGAR) KOLKATA CIVIC SEED DATA
# -------------------------------------------------------------
SALT_LAKE_CLUSTERS_DATA = [
    {
        "cluster_id": "ISSUE-2026-WAT-CC01",
        "title": "Major Drinking Water Main Rupture at Karunamoyee Hub",
        "department": "Water Board",
        "priority": "High",
        "status": "In Progress",
        "centroid_lat": 22.5867,
        "centroid_lon": 88.4197,
        "radius_meters": 160.0,
        "growth_rate_pct": 140.0,
        "why_grouped": "Grouped 5 corroborating citizen reports within a 160m radius near Karunamoyee Central Park reporting clean drinking water pipeline burst flooding the bus corridor.",
        "complaints": [
            {
                "serial": "CP-2026-WB-K01",
                "lang": "bn",
                "transcript": "করুণাময়ী বাস টার্মিনাসের সামনে বড় জলের পাইপ ফেটে গেছে, সকাল থেকে প্রচুর জল রাস্তায় নষ্ট হচ্ছে।",
                "translation": "Large water pipe has burst in front of Karunamoyee bus terminus, massive amount of water wasting on street since morning.",
                "lat": 22.5868, "lon": 88.4196,
                "address": "Karunamoyee Bus Terminus, Sector II, Salt Lake, Kolkata",
                "completeness": 95,
                "priority": "High",
                "entities": {"category": "Water Board", "sub_category": "Pipeline Rupture", "duration_observed": "Since morning", "landmark_or_spot": "Karunamoyee Bus Terminus"}
            },
            {
                "serial": "CP-2026-WB-K02",
                "lang": "hi",
                "transcript": "करुणामयी मेट्रो पिलर 14 के पास मेन वाटर सप्लाई लाइन फट गई है, सड़क पर पानी भर गया है।",
                "translation": "Main water supply line burst near Karunamoyee metro pillar 14, water is overflowing onto the road.",
                "lat": 22.5866, "lon": 88.4198,
                "address": "Metro Pillar 14, Central Park Side, Sector II, Salt Lake, Kolkata",
                "completeness": 90,
                "priority": "High",
                "entities": {"category": "Water Board", "sub_category": "Pipeline Rupture", "duration_observed": "4 hours", "landmark_or_spot": "Metro Pillar 14"}
            },
            {
                "serial": "CP-2026-WB-K03",
                "lang": "en",
                "transcript": "High pressure potable water gushing from underground pipeline near Karunamoyee crossing.",
                "translation": "High pressure potable water gushing from underground pipeline near Karunamoyee crossing.",
                "lat": 22.5869, "lon": 88.4195,
                "address": "Karunamoyee Crossing, Salt Lake Sector II, Kolkata",
                "completeness": 85,
                "priority": "High",
                "entities": {"category": "Water Board", "sub_category": "Pipeline Rupture", "duration_observed": "Today", "landmark_or_spot": "Karunamoyee Crossing"}
            },
            {
                "serial": "CP-2026-WB-K04",
                "lang": "hi",
                "transcript": "Karunamoyee junction pe paani ka pipe toota hua hai gaadi nikalne me dikkat ho rahi hai.",
                "translation": "Water pipe broken at Karunamoyee junction creating severe traffic obstruction.",
                "lat": 22.5865, "lon": 88.4199,
                "address": "Central Park Gate 2, Salt Lake Sector II, Kolkata",
                "completeness": 80,
                "priority": "High",
                "entities": {"category": "Water Board", "sub_category": "Pipeline Rupture", "duration_observed": "2 hours", "landmark_or_spot": "Central Park Gate 2"}
            },
            {
                "serial": "CP-2026-WB-K05",
                "lang": "bn",
                "transcript": "করুণাময়ী গোলচক্করের কাছে পাইপলাইন লিকেজের জন্য পানীয় জলের তীব্র অপচয় হচ্ছে।",
                "translation": "Pipeline leakage near Karunamoyee roundabout causing severe wastage of drinking water.",
                "lat": 22.5867, "lon": 88.4197,
                "address": "Karunamoyee Roundabout, Salt Lake, Kolkata",
                "completeness": 90,
                "priority": "High",
                "entities": {"category": "Water Board", "sub_category": "Pipeline Rupture", "duration_observed": "5 hours", "landmark_or_spot": "Karunamoyee Roundabout"}
            }
        ]
    },
    {
        "cluster_id": "ISSUE-2026-ELE-V02",
        "title": "High-Voltage Transformer Sparking & Cable Hazard at Sector V IT Corridor",
        "department": "Electricity Board",
        "priority": "High",
        "status": "Reported",
        "centroid_lat": 22.5760,
        "centroid_lon": 88.4342,
        "radius_meters": 130.0,
        "growth_rate_pct": 180.0,
        "why_grouped": "Grouped 4 urgent reports within 130m near College More / Webel Bhavan Sector V reporting heavy sparks and burning smell from power transformer.",
        "complaints": [
            {
                "serial": "CP-2026-EB-S01",
                "lang": "en",
                "transcript": "11kV electrical transformer sparking intensely with loud popping noise outside College More tech park.",
                "translation": "11kV electrical transformer sparking intensely with loud popping noise outside College More tech park.",
                "lat": 22.5761, "lon": 88.4341,
                "address": "College More, Sector V, Salt Lake, Kolkata",
                "completeness": 100,
                "priority": "High",
                "entities": {"category": "Electricity Board", "sub_category": "Transformer Hazard", "duration_observed": "1 hour", "landmark_or_spot": "College More"}
            },
            {
                "serial": "CP-2026-EB-S02",
                "lang": "bn",
                "transcript": "ওয়েবেল মোড়ের কাছে ইলেকট্রিক তার ছিঁড়ে ঝুলছে এবং ট্রান্সফর্মার থেকে ধোঁয়া বেরোচ্ছে।",
                "translation": "Electric wire hanging loose and smoke emitting from transformer near Webel More.",
                "lat": 22.5759, "lon": 88.4343,
                "address": "Webel Bhavan Road, Sector V, Salt Lake, Kolkata",
                "completeness": 95,
                "priority": "High",
                "entities": {"category": "Electricity Board", "sub_category": "Hanging Live Wire", "duration_observed": "45 mins", "landmark_or_spot": "Webel Bhavan"}
            },
            {
                "serial": "CP-2026-EB-S03",
                "lang": "hi",
                "transcript": "Sector V College More ke paas transformer se aag ki chingariyan gir rahi hain footpath par.",
                "translation": "Fire sparks falling on pedestrian footpath from transformer near Sector V College More.",
                "lat": 22.5762, "lon": 88.4340,
                "address": "SDF Building Crossing, Sector V, Salt Lake, Kolkata",
                "completeness": 90,
                "priority": "High",
                "entities": {"category": "Electricity Board", "sub_category": "Transformer Hazard", "duration_observed": "30 mins", "landmark_or_spot": "SDF Building Crossing"}
            },
            {
                "serial": "CP-2026-EB-S04",
                "lang": "bn",
                "transcript": "সেক্টর ৫ এ আইটি অফিসের সামনে হাই ভোল্টেজ তারে শর্ট সার্কিট হচ্ছে অবিলম্বে বিদ্যুৎ বন্ধ করুন।",
                "translation": "Short circuit occurring in high voltage wire in front of Sector 5 IT office, disconnect power immediately.",
                "lat": 22.5758, "lon": 88.4344,
                "address": "Godrej Waterside Avenue, Sector V, Salt Lake, Kolkata",
                "completeness": 95,
                "priority": "High",
                "entities": {"category": "Electricity Board", "sub_category": "Transformer Hazard", "duration_observed": "1 hour", "landmark_or_spot": "Godrej Waterside"}
            }
        ]
    },
    {
        "cluster_id": "ISSUE-2026-ROA-CC03",
        "title": "Severe Asphalt Cave-In & Deep Trench outside City Centre 1",
        "department": "Roads Department",
        "priority": "Medium",
        "status": "Reported",
        "centroid_lat": 22.5898,
        "centroid_lon": 88.4082,
        "radius_meters": 170.0,
        "growth_rate_pct": 80.0,
        "why_grouped": "Grouped 4 corroborating reports within 170m near City Centre 1 DC Block avenue reporting deep potholes and road subsidence.",
        "complaints": [
            {
                "serial": "CP-2026-RD-C01",
                "lang": "bn",
                "transcript": "সিটি সেন্টার ১ মেইন গেটের কাছে রাস্তায় বিশালাকার গর্ত তৈরি হয়েছে, বাইক আরোহীরা পড়ে যাচ্ছে।",
                "translation": "Huge crater-like pothole formed near City Centre 1 main gate, two-wheelers slipping and falling.",
                "lat": 22.5899, "lon": 88.4081,
                "address": "City Centre 1 Gate 2, DC Block, Salt Lake, Kolkata",
                "completeness": 90,
                "priority": "Medium",
                "entities": {"category": "Roads Department", "sub_category": "Pothole / Road Collapse", "duration_observed": "3 days", "landmark_or_spot": "City Centre 1 Gate 2"}
            },
            {
                "serial": "CP-2026-RD-C02",
                "lang": "hi",
                "transcript": "City Centre 1 DC block ke samne road dhans gayi hai, 2 feet gehra khadda hai.",
                "translation": "Road has caved in front of City Centre 1 DC block, creating a 2-foot deep pit.",
                "lat": 22.5897, "lon": 88.4083,
                "address": "DC Block Avenue, Salt Lake Sector I, Kolkata",
                "completeness": 85,
                "priority": "Medium",
                "entities": {"category": "Roads Department", "sub_category": "Pothole / Road Collapse", "duration_observed": "2 days", "landmark_or_spot": "DC Block Avenue"}
            },
            {
                "serial": "CP-2026-RD-C03",
                "lang": "en",
                "transcript": "Dangerous road sinkhole on main commercial boulevard opposite City Centre Mall parking.",
                "translation": "Dangerous road sinkhole on main commercial boulevard opposite City Centre Mall parking.",
                "lat": 22.5896, "lon": 88.4084,
                "address": "DC Block Commercial Boulevard, Salt Lake, Kolkata",
                "completeness": 85,
                "priority": "Medium",
                "entities": {"category": "Roads Department", "sub_category": "Pothole / Road Collapse", "duration_observed": "3 days", "landmark_or_spot": "City Centre Mall Parking"}
            },
            {
                "serial": "CP-2026-RD-C04",
                "lang": "bn",
                "transcript": "ডিসি ব্লক মোড়ে পিচ উঠে গিয়ে বড় গর্ত, অবিলম্বে রাস্তা মেরামত প্রয়োজন।",
                "translation": "Tar washed away creating large hole at DC block crossing, urgent road repair required.",
                "lat": 22.5900, "lon": 88.4080,
                "address": "DC Block Crossing, Salt Lake, Kolkata",
                "completeness": 80,
                "priority": "Medium",
                "entities": {"category": "Roads Department", "sub_category": "Pothole / Road Collapse", "duration_observed": "4 days", "landmark_or_spot": "DC Block Crossing"}
            }
        ]
    },
    {
        "cluster_id": "ISSUE-2026-MUN-ST04",
        "title": "Unattended Garbage Dump & Drainage Overflow near Salt Lake Stadium",
        "department": "Municipality",
        "priority": "Medium",
        "status": "Reported",
        "centroid_lat": 22.5715,
        "centroid_lon": 88.4045,
        "radius_meters": 150.0,
        "growth_rate_pct": 65.0,
        "why_grouped": "Grouped 4 complaints reporting uncollected garbage heaps and choked roadside drains near Salt Lake Stadium Gate 3 / BD Block market.",
        "complaints": [
            {
                "serial": "CP-2026-MU-S01",
                "lang": "bn",
                "transcript": "সল্টলেক স্টেডিয়াম ৩ নম্বর গেটের কাছে ডাস্টবিন উপচে আবর্জনা রাস্তায় ছড়িয়ে রয়েছে, চরম দুর্গন্ধ।",
                "translation": "Dustbin overflowing with garbage spread across street near Salt Lake Stadium Gate 3, extreme stench.",
                "lat": 22.5716, "lon": 88.4044,
                "address": "Salt Lake Stadium Gate 3, Sector III, Kolkata",
                "completeness": 90,
                "priority": "Medium",
                "entities": {"category": "Municipality", "sub_category": "Garbage Overflow", "duration_observed": "4 days", "landmark_or_spot": "Salt Lake Stadium Gate 3"}
            },
            {
                "serial": "CP-2026-MU-S02",
                "lang": "hi",
                "transcript": "Stadium road BD block market ke paas kachra jama hai aur nala block ho gaya hai.",
                "translation": "Garbage accumulated near Stadium road BD block market and open drain is blocked.",
                "lat": 22.5714, "lon": 88.4046,
                "address": "BD Block Market, Salt Lake Sector III, Kolkata",
                "completeness": 85,
                "priority": "Medium",
                "entities": {"category": "Municipality", "sub_category": "Blocked Drain & Garbage", "duration_observed": "3 days", "landmark_or_spot": "BD Block Market"}
            },
            {
                "serial": "CP-2026-MU-S03",
                "lang": "en",
                "transcript": "Rotting organic municipal waste dumped on sidewalk near Hyatt Regency / Stadium pathway.",
                "translation": "Rotting organic municipal waste dumped on sidewalk near Hyatt Regency / Stadium pathway.",
                "lat": 22.5717, "lon": 88.4043,
                "address": "Broadway Road, near Stadium, Salt Lake, Kolkata",
                "completeness": 80,
                "priority": "Medium",
                "entities": {"category": "Municipality", "sub_category": "Garbage Overflow", "duration_observed": "5 days", "landmark_or_spot": "Broadway Road"}
            },
            {
                "serial": "CP-2026-MU-S04",
                "lang": "bn",
                "transcript": "স্টেডিয়ামের ফুটপাথে জমা ময়লা সাফাই না করায় মশার উপদ্রব মারাত্মক বেড়েছে।",
                "translation": "Uncleaned garbage heap on stadium pavement causing severe mosquito breeding hazard.",
                "lat": 22.5713, "lon": 88.4047,
                "address": "JB Block Avenue, Sector III, Salt Lake, Kolkata",
                "completeness": 85,
                "priority": "Medium",
                "entities": {"category": "Municipality", "sub_category": "Garbage Overflow", "duration_observed": "1 week", "landmark_or_spot": "JB Block Avenue"}
            }
        ]
    }
]

# Additional isolated / standalone complaints in Salt Lake Kolkata
SALT_LAKE_STANDALONE_COMPLAINTS = [
    {
        "serial": "CP-2026-SAF-01",
        "lang": "en",
        "transcript": "Open uncovered manhole without warning sign on pavement near Nicco Park main entrance.",
        "translation": "Open uncovered manhole without warning sign on pavement near Nicco Park main entrance.",
        "department": "Public Safety",
        "priority": "High",
        "lat": 22.5702, "lon": 88.4215,
        "address": "Nicco Park Main Gate, Salt Lake, Kolkata",
        "completeness": 95,
        "override_reason": "Open manhole hazard on public pedestrian pathway",
        "entities": {"category": "Public Safety", "sub_category": "Open Manhole", "duration_observed": "2 days", "landmark_or_spot": "Nicco Park Main Gate"}
    },
    {
        "serial": "CP-2026-ELE-02",
        "lang": "bn",
        "transcript": "এজে ব্লকে টানা ৫টি স্ট্রিট লাইট নষ্ট, রাতে রাস্তা সম্পূর্ণ অন্ধকার ও অসুরক্ষিত।",
        "translation": "5 consecutive streetlights not working in AJ block, road completely dark and unsafe at night.",
        "department": "Electricity Board",
        "priority": "Low",
        "lat": 22.5930, "lon": 88.4110,
        "address": "AJ Block, Sector II, Salt Lake, Kolkata",
        "completeness": 85,
        "entities": {"category": "Electricity Board", "sub_category": "Streetlight Defect", "duration_observed": "1 week", "landmark_or_spot": "AJ Block Park"}
    },
    {
        "serial": "CP-2026-ROA-03",
        "lang": "hi",
        "transcript": "Ultadanga Hudco crossing se Salt Lake entry par traffic signal kharab hai jam lag raha hai.",
        "translation": "Traffic signal malfunctioning at Ultadanga Hudco crossing Salt Lake entry causing heavy bottleneck.",
        "department": "Roads Department",
        "priority": "Medium",
        "lat": 22.5925, "lon": 88.3980,
        "address": "Hudco Crossing, Ultadanga / Salt Lake Entry, Kolkata",
        "completeness": 90,
        "entities": {"category": "Roads Department", "sub_category": "Traffic Light Defect", "duration_observed": "Since yesterday", "landmark_or_spot": "Hudco Crossing"}
    },
    {
        "serial": "CP-2026-WAT-04",
        "lang": "bn",
        "transcript": "জিডি ব্লকে গত ২ দিন ধরে পুরসভার পানীয় জলে তীব্র কাদা ও দুর্গন্ধ আসছে।",
        "translation": "Municipal supply water coming muddy with foul smell in GD block for past 2 days.",
        "department": "Water Board",
        "priority": "Medium",
        "lat": 22.5810, "lon": 88.4140,
        "address": "GD Block, Sector III, Salt Lake, Kolkata",
        "completeness": 85,
        "entities": {"category": "Water Board", "sub_category": "Contaminated Water", "duration_observed": "2 days", "landmark_or_spot": "GD Block Market"}
    }
]


def seed_salt_lake_grievances():
    print("[*] Generating dense embeddings & inserting Salt Lake Kolkata grievances...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    now = datetime.now(timezone.utc)
    all_seeded_count = 0

    # 1. Insert Macro Clusters & Their Member Complaints
    for cluster_def in SALT_LAKE_CLUSTERS_DATA:
        cid = cluster_def["cluster_id"]
        member_serials = [c["serial"] for c in cluster_def["complaints"]]
        cluster_rep_time = (now - timedelta(hours=random.randint(4, 24))).isoformat()

        # Compute cluster centroid embedding
        cluster_summary_text = f"{cluster_def['title']} - {cluster_def['department']}"
        cluster_emb = generate_embedding(cluster_summary_text)

        cursor.execute("""
        INSERT INTO issue_clusters (
            cluster_id, title, department, priority, status, centroid_lat, centroid_lon,
            radius_meters, complaint_count, growth_rate_pct, why_grouped,
            first_reported_at, updated_at, complaint_serials, cluster_embedding
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cid,
            cluster_def["title"],
            cluster_def["department"],
            cluster_def["priority"],
            cluster_def["status"],
            cluster_def["centroid_lat"],
            cluster_def["centroid_lon"],
            cluster_def["radius_meters"],
            len(member_serials),
            cluster_def["growth_rate_pct"],
            cluster_def["why_grouped"],
            cluster_rep_time,
            now.isoformat(),
            json.dumps(member_serials),
            json.dumps(cluster_emb)
        ))

        # Insert Member Complaints
        for idx, comp in enumerate(cluster_def["complaints"]):
            c_time = (now - timedelta(hours=random.randint(1, 18), minutes=random.randint(5, 50))).isoformat()
            c_emb = generate_embedding(comp["translation"])

            is_dup = idx > 0
            dup_of = member_serials[0] if is_dup else None

            cursor.execute("""
            INSERT INTO issues (
                _id, serial, message, location, areaImpact, status, department, priority,
                confidence, reportedAt, detected_language, transcript, translation,
                structured_entities, completeness_score, is_duplicate, duplicate_of_serial,
                cluster_id, relationship_score, ai_recommendation, embedding
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"ID-{comp['serial']}",
                comp["serial"],
                comp["transcript"],
                json.dumps({"lat": comp["lat"], "lon": comp["lon"], "address": comp["address"]}),
                json.dumps({"schools": 1, "hospitals": 1 if cluster_def["priority"] == "High" else 0, "residential": 1}),
                cluster_def["status"],
                cluster_def["department"],
                comp["priority"],
                0.94,
                c_time,
                comp["lang"],
                comp["transcript"],
                comp["translation"],
                json.dumps(comp["entities"]),
                comp["completeness"],
                1 if is_dup else 0,
                dup_of,
                cid,
                0.88 if is_dup else 0.55,
                json.dumps({"predicted_department": cluster_def["department"], "predicted_priority": comp["priority"], "confidence": 0.94, "is_overridden": False}),
                json.dumps(c_emb)
            ))
            all_seeded_count += 1

    # 2. Insert Standalone / Isolated Grievances
    for s_comp in SALT_LAKE_STANDALONE_COMPLAINTS:
        s_time = (now - timedelta(hours=random.randint(6, 36))).isoformat()
        s_emb = generate_embedding(s_comp["translation"])

        cursor.execute("""
        INSERT INTO issues (
            _id, serial, message, location, areaImpact, status, department, priority,
            confidence, reportedAt, detected_language, transcript, translation,
            structured_entities, completeness_score, is_duplicate, duplicate_of_serial,
            cluster_id, relationship_score, ai_recommendation, override_reason, embedding
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"ID-{s_comp['serial']}",
            s_comp["serial"],
            s_comp["transcript"],
            json.dumps({"lat": s_comp["lat"], "lon": s_comp["lon"], "address": s_comp["address"]}),
            json.dumps({"schools": 0, "hospitals": 1 if s_comp["priority"] == "High" else 0, "residential": 1}),
            "Reported",
            s_comp["department"],
            s_comp["priority"],
            0.92,
            s_time,
            s_comp["lang"],
            s_comp["transcript"],
            s_comp["translation"],
            json.dumps(s_comp["entities"]),
            s_comp["completeness"],
            0,
            None,
            None,
            0.30,
            json.dumps({"predicted_department": s_comp["department"], "predicted_priority": s_comp["priority"], "confidence": 0.92, "is_overridden": "override_reason" in s_comp}),
            s_comp.get("override_reason"),
            json.dumps(s_emb)
        ))
        all_seeded_count += 1

    conn.commit()
    conn.close()
    print(f"[+] Successfully seeded {all_seeded_count} Salt Lake Kolkata civic complaints across 4 Macro-Issue Clusters.")


def main():
    print("=" * 60)
    print("NIVARAN CIVIC AI — SALT LAKE KOLKATA SEED SCRIPT")
    print("=" * 60)
    reset_and_init_db()
    seed_users()
    seed_salt_lake_grievances()
    print("=" * 60)
    print("SEEDING COMPLETE: 100% READY FOR LIVE PRESENTATION & DEMOS")
    print("=" * 60)


if __name__ == "__main__":
    main()
