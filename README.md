# 🛰️ OmniScope MCP Suite [OFFICIAL]

[![Official Original Project](https://img.shields.io/badge/OmniScope-OFFICIAL%20ORIGINAL-00ffcc?style=for-the-badge&logo=shield)](https://github.com/finnytech/omniscope-mcp)
[![Author: FinnyTech](https://img.shields.io/badge/Author-FinnyTech-ff0055?style=for-the-badge)](https://github.com/finnytech)
[![MCP Protocol: 2024-11-05](https://img.shields.io/badge/MCP-2024--11--05-blue?style=for-the-badge)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

The official **Model Context Protocol (MCP)** suite for the **OmniScope OSINT Tactical Ecosystem**, providing LLMs, autonomous agents (Claude Desktop, Cursor, Zed, Windsurf), and developers with direct access to global geospatial intelligence, numerical weather supercomputers, and local high-density spatial databases.

---

## ⚡ Two Specialized Editions in One Repository

OmniScope MCP is designed with two distinct operational modes:

| Feature | 🌐 Edition A: Web Edge MCP (`web/`) | 🖥️ Edition B: Local Spatial Grid MCP (`local/`) |
| :--- | :--- | :--- |
| **Target Audience** | Zero-setup users, cloud agents, serverless runners | Local developers, analysts, offline/standalone Windows `.exe` users |
| **Primary Data Source** | Cloudflare Anycast Edge APIs (`omniscope-web.pages.dev/api/*`) | High-speed local SQLite database (`nodes.db` / `omniscope_spatial.db`) |
| **Node Coverage** | Global 147-model consensus, NOAA alerts, USGS quakes | **1,013,474 indexed ground nodes** (508,474 cams + 505,000 weather stations) |
| **Dependencies** | **Zero dependencies** (pure Node.js 18+ standard library) | Pure Python standard library (`sqlite3`, `json`, `math`) |
| **Setup Time** | Instant (run with `node` or `npx`) | Sub-millisecond local queries from disk |
| **Remote HTTP / SSE** | Supported (`/mcp` and `/mcp/sse`) | Stdio IPC for Claude Desktop & local CLI |

---

## 🚀 Quick Start

### 1. Web Edition MCP (`web/index.js`)

Connects directly to the live Cloudflare Anycast edge APIs:
- 147-model numerical weather consensus
- Real-time USGS earthquake feeds
- NOAA NWS active convective storm and tornado warnings
- NOAA SWPC solar storm and Kp-index telemetry
- Verified public streaming webcams directory
- Multi-sensor tactical Situation Reports (SITREP)

#### Configuration in Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "omniscope-web": {
      "command": "node",
      "args": ["<PATH_TO_OMNISCOPE_MCP>/web/index.js"]
    }
  }
}
```
> 💡 *Replace `<PATH_TO_OMNISCOPE_MCP>` with the directory where you cloned this repository (e.g. `/home/user/omniscope-mcp` or `C:/tools/omniscope-mcp`).*

---

### 2. Local Spatial Grid MCP (`local/server.py`)

Connects directly to your local `nodes.db` or `omniscope_spatial.db` on disk, performing indexed bounding-box and keyword searches across **1,000,000+ verified sensors** in < 5ms without network calls.

#### Configuration in Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "omniscope-local": {
      "command": "python",
      "args": ["<PATH_TO_OMNISCOPE_MCP>/local/server.py"]
    }
  }
}
```

#### Dual Setup (Both Web & Local Active):
```json
{
  "mcpServers": {
    "omniscope-web": {
      "command": "node",
      "args": ["<PATH_TO_OMNISCOPE_MCP>/web/index.js"]
    },
    "omniscope-local": {
      "command": "python",
      "args": ["<PATH_TO_OMNISCOPE_MCP>/local/server.py"]
    }
  }
}
```
> 💡 *Replace `<PATH_TO_OMNISCOPE_MCP>` with your actual clone directory path.*

---

## 🛠️ Available MCP Tools

### Web Edition Tools:
1. `omniscope_weather_consensus`: Real-time consensus forecast across DWD ICON, ECMWF IFS, NOAA GFS, and GEM Global.
2. `omniscope_storm_intercept`: Active convective storms, tornado warnings, and flash flood alerts from NOAA NWS.
3. `omniscope_seismic_monitor`: Global tectonic earthquakes from USGS with magnitude, depth, and tsunami flags.
4. `omniscope_space_weather`: Geomagnetic storm levels, planetary Kp-index, and solar telemetry from NOAA SWPC.
5. `omniscope_search_webcams`: Search public highway, alpine, coastal, and scenic surveillance webcams.
6. `omniscope_generate_sitrep`: Synthesizes a structured tactical Situation Report (SITREP) combining all live data layers.

### Local Edition Tools:
1. `omniscope_local_search_cameras`: Sub-millisecond indexed query across 105,000+ local surveillance webcams in `nodes.db`.
2. `omniscope_local_weather_stations`: Query 505,000+ ground observation stations with coordinates and payload.
3. `omniscope_local_db_stats`: Real-time health, size, and record counts of the connected SQLite spatial database.

---

## 🌐 Related Official Repositories

- **OmniScope Web**: [`https://github.com/finnytech/omniscope-web`](https://github.com/finnytech/omniscope-web) (Live: [`https://omniscope-web.pages.dev`](https://omniscope-web.pages.dev))
- **OmniScope OSINT (Desktop & Engine)**: [`https://github.com/finnytech/omniscope-osint`](https://github.com/finnytech/omniscope-osint)
- **OmniScope MCP**: [`https://github.com/finnytech/omniscope-mcp`](https://github.com/finnytech/omniscope-mcp)

---

## 📄 License

Distributed under the **MIT License**. Created & maintained exclusively by **FinnyTech**.
