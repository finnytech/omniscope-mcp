#!/usr/bin/env python3
"""
OmniScope Local MCP Server (Localhost & Standalone Engine)
Direct Model Context Protocol (MCP) server connecting to local SQLite spatial databases:
- nodes.db
- omniscope_spatial.db
- nexus_spatial.db

Enables sub-millisecond querying across 1,000,000+ indexed camera and weather nodes.
"""

import os
import sys
import json
import sqlite3
import math
from typing import Dict, Any, List, Optional

SERVER_NAME = "omniscope-local-mcp"
SERVER_VERSION = "2.0.0"

# Auto-locate database
DB_ENV = os.environ.get("OMNISCOPE_DB_PATH")
CANDIDATES = [
    DB_ENV,
    os.path.join(os.path.dirname(__file__), "nodes.db"),
    os.path.join(os.path.dirname(__file__), "omniscope_spatial.db"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "omniscope-osint", "backend", "data", "nodes.db"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "omniscope-osint", "backend", "data", "omniscope_spatial.db"),
    r"D:\projects\omniscope-osint\backend\data\omniscope_spatial.db",
    r"D:\projects\omniscope-osint\backend\data\nodes.db",
    r"D:\projects\omniscope-osint\backend\data\nexus_spatial.db"
]

DB_PATH = next((p for p in CANDIDATES if p and os.path.exists(p)), None)

def get_db():
    if not DB_PATH or not os.path.exists(DB_PATH):
        return None
    try:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        sys.stderr.write(f"[LocalMCP] Error opening database: {e}\n")
        return None

TOOLS = [
  {
    "name": "omniscope_local_search_cameras",
    "description": "Sub-millisecond query across 105,000+ local surveillance webcams and traffic sensors in SQLite nodes.db.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": { "type": "string", "description": "Search keyword matching title, city, or provider (e.g. Zugspitze, Autobahn, Miami)" },
        "country": { "type": "string", "description": "Filter by country (e.g. Germany, United States, Austria)" },
        "limit": { "type": "integer", "description": "Max results to return (default 25, max 100)" },
        "bbox": {
          "type": "object",
          "description": "Optional bounding box {min_lat, min_lon, max_lat, max_lon}",
          "properties": {
            "min_lat": { "type": "number" },
            "min_lon": { "type": "number" },
            "max_lat": { "type": "number" },
            "max_lon": { "type": "number" }
          }
        }
      },
      "required": []
    }
  },
  {
    "name": "omniscope_local_weather_stations",
    "description": "Query 505,000+ ground weather observation stations indexed in local spatial database.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "latitude": { "type": "number", "description": "Center latitude" },
        "longitude": { "type": "number", "description": "Center longitude" },
        "radius_km": { "type": "number", "description": "Search radius in kilometers (default 50)" },
        "limit": { "type": "integer", "description": "Max stations to return (default 25)" }
      },
      "required": ["latitude", "longitude"]
    }
  },
  {
    "name": "omniscope_local_db_stats",
    "description": "Return health, node counts, and table statistics of the local SQLite spatial database.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  }
]

def handle_search_cameras(args: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db()
    if not conn:
        return {"status": "error", "message": f"Local spatial database not found. Looked at: {DB_PATH}"}

    query = args.get("query", "").strip()
    country = args.get("country", "").strip()
    limit = min(int(args.get("limit", 25)), 100)
    bbox = args.get("bbox")

    conditions = []
    params = []

    if query:
        conditions.append("(title LIKE ? OR city LIKE ? OR provider LIKE ?)")
        wild = f"%{query}%"
        params.extend([wild, wild, wild])

    if country:
        conditions.append("country LIKE ?")
        params.append(f"%{country}%")

    if bbox and isinstance(bbox, dict):
        min_lat = bbox.get("min_lat", -90)
        max_lat = bbox.get("max_lat", 90)
        min_lon = bbox.get("min_lon", -180)
        max_lon = bbox.get("max_lon", 180)
        conditions.append("(lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?)")
        params.extend([min_lat, max_lat, min_lon, max_lon])

    where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    sql = f"SELECT id, title, lat, lon, provider, city, country, stream_url, poster_url FROM cameras {where_sql} LIMIT ?"
    params.append(limit)

    cur = conn.cursor()
    cur.execute(sql, params)
    rows = [dict(r) for r in cur.fetchall()]

    return {
        "status": "ok",
        "returned_count": len(rows),
        "database_path": DB_PATH,
        "cameras": rows
    }

def handle_weather_stations(args: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db()
    if not conn:
        return {"status": "error", "message": f"Local spatial database not found. Looked at: {DB_PATH}"}

    lat = float(args.get("latitude", 50.11))
    lon = float(args.get("longitude", 8.68))
    radius_km = float(args.get("radius_km", 50))
    limit = min(int(args.get("limit", 25)), 100)

    # Approximate 1 degree ~ 111 km
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / (111.0 * max(0.1, math.cos(math.radians(lat))))

    sql = """
    SELECT id, name, lat, lon, elevation, payload
    FROM weather_stations
    WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
    LIMIT ?
    """
    params = [lat - lat_delta, lat + lat_delta, lon - lon_delta, lon + lon_delta, limit]

    cur = conn.cursor()
    cur.execute(sql, params)
    rows = []
    for r in cur.fetchall():
        item = dict(r)
        if item.get("payload") and isinstance(item["payload"], str):
            try:
                item["payload"] = json.loads(item["payload"])
            except Exception:
                pass
        rows.append(item)

    return {
        "status": "ok",
        "center": {"latitude": lat, "longitude": lon},
        "search_radius_km": radius_km,
        "returned_count": len(rows),
        "database_path": DB_PATH,
        "stations": rows
    }

def handle_db_stats() -> Dict[str, Any]:
    conn = get_db()
    if not conn:
        return {"status": "error", "database_path": DB_PATH, "connected": False}

    cur = conn.cursor()
    stats = {}
    for table in ["cameras", "weather_stations"]:
        try:
            cur.execute(f"SELECT max(rowid) FROM {table}")
            val = cur.fetchone()[0]
            stats[table] = val or 0
        except Exception:
            stats[table] = 0

    size_mb = 0
    if DB_PATH and os.path.exists(DB_PATH):
        size_mb = round(os.path.getsize(DB_PATH) / (1024 * 1024), 2)

    return {
        "status": "ok",
        "database_path": DB_PATH,
        "size_mb": size_mb,
        "connected": True,
        "estimated_records": stats
    }

def send_response(req_id, result=None, error=None):
    resp = {"jsonrpc": "2.0", "id": req_id}
    if error:
        resp["error"] = error
    else:
        resp["result"] = result
    sys.stdout.write(json.dumps(resp) + "\n")
    sys.stdout.flush()

def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except Exception:
            send_response(None, error={"code": -32700, "message": "Parse error"})
            continue

        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})

        if method == "initialize":
            send_response(req_id, {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {"listChanged": False},
                    "resources": {"listChanged": False},
                    "prompts": {"listChanged": False}
                },
                "serverInfo": {
                    "name": SERVER_NAME,
                    "version": SERVER_VERSION
                }
            })
            continue

        if method in ("notifications/initialized", "initialized"):
            continue

        if method == "ping":
            send_response(req_id, {})
            continue

        if method == "tools/list":
            send_response(req_id, {"tools": TOOLS})
            continue

        if method == "tools/call":
            name = params.get("name")
            args = params.get("arguments", {})

            try:
                if name == "omniscope_local_search_cameras":
                    res = handle_search_cameras(args)
                elif name == "omniscope_local_weather_stations":
                    res = handle_weather_stations(args)
                elif name == "omniscope_local_db_stats":
                    res = handle_db_stats()
                else:
                    send_response(req_id, error={"code": -32601, "message": f"Tool '{name}' not found"})
                    continue

                send_response(req_id, {
                    "content": [{"type": "text", "text": json.dumps(res, indent=2, ensure_ascii=False)}],
                    "isError": res.get("status") == "error"
                })
            except Exception as e:
                send_response(req_id, {
                    "content": [{"type": "text", "text": f"Execution error in {name}: {str(e)}"}],
                    "isError": True
                })
            continue

        send_response(req_id, error={"code": -32601, "message": f"Method '{method}' not found"})

if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, SystemExit):
        os._exit(0)
    except Exception as e:
        sys.stderr.write(f"Fatal error in local MCP server: {e}\n")
        os._exit(1)
