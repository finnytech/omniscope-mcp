#!/usr/bin/env node

/**
 * OmniScope OSINT - Web Edition MCP Server
 * Zero-dependency Model Context Protocol (MCP) server for Claude Desktop, Cursor, and Agent Frameworks.
 * Connects directly to the live OmniScope Tactical Edge APIs on Cloudflare Anycast with automatic resilient upstream fallback.
 */

import readline from "node:readline";

const API_BASE = process.env.OMNISCOPE_API_BASE || "https://omniscope-web.pages.dev/api";
const SERVER_NAME = "omniscope-web-mcp";
const SERVER_VERSION = "2.9.9";

const TOOLS = [
  {
    name: "omniscope_weather_consensus",
    description: "Calculate live meteorological multi-model consensus across 147 certified models (DWD ICON, ECMWF IFS, NOAA GFS, GEM Global) for any global coordinates.",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        latitude: { type: "number", description: "Latitude of location (-90 to 90)" },
        longitude: { type: "number", description: "Longitude of location (-180 to 180)" },
        models: { type: "string", description: "Comma-separated model names (optional, defaults to dwd_icon,ecmwf_ifs025,gfs_seamless,gem_global)" }
      },
      required: ["latitude", "longitude"]
    }
  },
  {
    name: "omniscope_storm_intercept",
    description: "Fetch real-time convective storm telemetry, NWS tornado warnings, and severe thunderstorm alerts from NOAA.",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "omniscope_seismic_monitor",
    description: "Query real-time global tectonic activity from USGS feeds, including magnitude, epicenter, depth, and tsunami alert flags.",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        min_magnitude: { type: "number", description: "Minimum earthquake magnitude (e.g. 2.5, 4.5)" },
        limit: { type: "integer", description: "Maximum number of events to return (1-100)" }
      },
      required: []
    }
  },
  {
    name: "omniscope_space_weather",
    description: "Retrieve current geomagnetic storm activity, planetary Kp-index, solar flux, and aurora visibility forecasts from NOAA SWPC.",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "omniscope_search_webcams",
    description: "Search global surveillance, highway, alpine, and scenic public webcams by location, country, or keyword.",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword in camera title or city (e.g. Zugspitze, Hamburg, Bridge)" },
        country: { type: "string", description: "Filter by country name (e.g. Germany, United States, Switzerland)" },
        limit: { type: "integer", description: "Maximum cameras to return (default 20, max 100)" }
      },
      required: []
    }
  },
  {
    name: "omniscope_generate_sitrep",
    description: "Synthesize a comprehensive tactical Situation Report (SITREP) combining weather, seismic, surveillance, and threat metrics for a specified location.",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        location: { type: "string", description: "Name of target location (e.g. Frankfurt, Berlin, Tokyo, New York)" },
        latitude: { type: "number", description: "Latitude of target location" },
        longitude: { type: "number", description: "Longitude of target location" }
      },
      required: ["location", "latitude", "longitude"]
    }
  },
  {
    name: "omniscope_chasers_live",
    description: "Fetch real-time GPS storm chasers, heading/speed telemetry, verified live video stream URLs, and Spotter Network severe reports.",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        include_reports: { type: "boolean", description: "Also include Spotter Network reports.txt tornado/hail/wind pins" }
      },
      required: []
    }
  },
  {
    name: "omniscope_radarhub_doppler",
    description: "Query OU ARRC RadarHub mobile Dopplers (PX-1000, RaXPol, PX-10k, Lidar-Roof, Bistatic-1) with WebSocket URLs, 30-day active calendar, hourly scan counts, plus FARM/DOW live units.",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        pathway: { type: "string", description: "Optional RadarHub pathway: px1000, raxpol, px10k, dlroof, bs1" },
        day: { type: "string", description: "Optional YYYYMMDD date for hourly scan counts & sweeps" }
      },
      required: []
    }
  },
  {
    name: "omniscope_spc_outlooks",
    description: "Retrieve NOAA SPC Convective Outlooks (Day 1-3 categorical/tornado/hail/wind GeoJSON) and past 24h NWS IEM Local Storm Reports (LSR).",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        day: { type: "string", description: "Outlook day: 1, 2, or 3 (default 1)" },
        hazard: { type: "string", description: "Hazard layer: cat, torn, hail, or wind (default cat)" },
        lsr_hours: { type: "integer", description: "Hours back for Local Storm Reports (1-48, default 24)" }
      },
      required: []
    }
  },
  {
    name: "omniscope_military_flights",
    description: "Fetch real-time keyless global Military ADS-B aircraft positions, callsigns, registrations, ICAO hex, altitude, speed, and emergency squawks.",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "omniscope_cyber_outages",
    description: "Fetch real-time global internet blackout/outage alerts (Georgia Tech IODA v2), censorship anomalies (OONI), and active botnet C2s (abuse.ch Feodo Tracker).",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "omniscope_natural_disasters",
    description: "Query live NASA EONET v3 natural hazard events (wildfires, volcanoes, severe storms) and GDACS UN/EU disaster alerts.",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "omniscope_space_satellites",
    description: "Retrieve live NORAD orbital element sets from CelesTrak (weather, noaa, goes, stations, starlink).",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        group: { type: "string", description: "CelesTrak group: weather, noaa, goes, stations, starlink (default weather)" }
      },
      required: []
    }
  },
  {
    name: "omniscope_radar_modes",
    description: "Inspect personalized Doppler radar provider capabilities, supported modes, and active WMS/XYZ tile endpoints (NEXRAD, OpenGeo Velocity/BDHC, DWD, KNMI, ECCC, JMA).",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        provider: { type: "string", description: "Radar provider id (e.g. nexrad, nexrad_l2, tdwr, dwd, knmi, eccc_canada, jma_japan)" },
        mode: { type: "string", description: "Radar mode (e.g. composite, velocity, dual_pol_cc, rain_rate, storm_cells, echo_tops)" }
      },
      required: []
    }
  }
];

// Fallback handlers to upstream public APIs
async function directFallback(toolName, args) {
  if (toolName === "omniscope_space_weather") {
    const res = await fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json");
    const data = await res.json();
    const rows = Array.isArray(data) ? data : [];
    const latest = rows.length > 0 ? rows[rows.length - 1] : null;
    const rawKp = latest ? (latest.Kp !== undefined ? latest.Kp : latest[1]) : 1.0;
    const kp = typeof rawKp === "number" ? rawKp : parseFloat(rawKp || "1.0");
    return {
      status: "ok",
      planetary_k_index: kp,
      source: "NOAA Space Weather Prediction Center (Direct Fallback)",
      observation_time: latest ? (latest.time_tag || latest[0] || new Date().toISOString()) : new Date().toISOString()
    };
  }

  if (toolName === "omniscope_seismic_monitor") {
    const minMag = parseFloat(args.min_magnitude || 2.5);
    const limit = parseInt(args.limit || 30, 10);
    const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson");
    const data = await res.json();
    const features = (data.features || []).filter(f => (f.properties?.mag || 0) >= minMag).slice(0, limit);
    return {
      status: "ok",
      count: features.length,
      events: features.map(f => ({
        id: f.id,
        title: f.properties?.title,
        magnitude: f.properties?.mag,
        place: f.properties?.place,
        time: new Date(f.properties?.time).toISOString()
      })),
      source: "USGS Earthquake Hazards Program (Direct Fallback)"
    };
  }

  if (toolName === "omniscope_storm_intercept") {
    const res = await fetch("https://api.weather.gov/alerts/active?status=actual&message_type=alert&severity=Extreme,Severe", {
      headers: { "User-Agent": "OmniScope-MCP/2.0 (Direct Fallback)" }
    });
    const data = await res.json();
    return {
      status: "ok",
      total_active_alerts: data.features?.length || 0,
      alerts: (data.features || []).slice(0, 30).map(f => ({
        event: f.properties?.event,
        area: f.properties?.areaDesc,
        severity: f.properties?.severity,
        headline: f.properties?.headline
      })),
      source: "NOAA National Weather Service (Direct Fallback)"
    };
  }

  if (toolName === "omniscope_weather_consensus") {
    const lat = parseFloat(args.latitude || 50.11);
    const lon = parseFloat(args.longitude || 8.68);
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&models=dwd_icon,ecmwf_ifs025,gfs_seamless,gem_global&forecast_days=1`);
    const data = await res.json();
    return {
      status: "ok",
      temperature: data.current?.temperature_2m,
      source: "Open-Meteo Multi-Model (Direct Fallback)"
    };
  }

  throw new Error(`Fallback not available for ${toolName}`);
}

async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      url.searchParams.set(key, String(val));
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "OmniScope-Web-MCP/2.0 (Claude/Agent Client)",
      "Accept": "application/json"
    }
  });

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok || !contentType.includes("application/json")) {
    throw new Error(`Edge returned non-JSON HTTP ${res.status}`);
  }

  return await res.json();
}

async function handleToolCall(name, args) {
  try {
    switch (name) {
      case "omniscope_weather_consensus":
        return await apiFetch("/weather", {
          latitude: args.latitude,
          longitude: args.longitude,
          models: args.models
        });

      case "omniscope_storm_intercept":
        return await apiFetch("/storms");

      case "omniscope_seismic_monitor":
        return await apiFetch("/seismic", {
          min_magnitude: args.min_magnitude || 2.5,
          limit: args.limit || 30
        });

      case "omniscope_space_weather":
        return await apiFetch("/space-weather");

      case "omniscope_search_webcams":
        return await apiFetch("/webcams", {
          query: args.query,
          country: args.country,
          limit: args.limit || 20
        });

      case "omniscope_generate_sitrep":
        return await apiFetch("/sitrep", {
          location: args.location,
          latitude: args.latitude,
          longitude: args.longitude
        });

      case "omniscope_chasers_live": {
        const ch = await apiFetch("/telemetry/chasers");
        if (args.include_reports) {
          const sr = await apiFetch("/spotter-reports").catch(() => ({ reports: [] }));
          return { ...ch, spotter_reports: sr.reports || [] };
        }
        return ch;
      }

      case "omniscope_radarhub_doppler": {
        const [rh, dow] = await Promise.all([
          apiFetch("/radarhub", { pathway: args.pathway, day: args.day }),
          apiFetch("/dow-live").catch(() => ({ units: [] }))
        ]);
        return { radarhub: rh, dow_live: dow };
      }

      case "omniscope_spc_outlooks": {
        const [otlk, lsr] = await Promise.all([
          apiFetch("/weather/spc-outlook", { day: args.day || "1", hazard: args.hazard || "cat" }),
          apiFetch("/weather/lsr", { hours: args.lsr_hours || 24 }).catch(() => ({ reports: [] }))
        ]);
        return { spc_outlook: otlk, local_storm_reports: lsr };
      }

      case "omniscope_military_flights":
        return await apiFetch("/aviation/military");

      case "omniscope_cyber_outages":
        return await apiFetch("/cyber/outages");

      case "omniscope_natural_disasters": {
        const [eonet, gdacs] = await Promise.all([
          apiFetch("/disasters/eonet"),
          apiFetch("/disasters/gdacs").catch(() => ({ features: [] }))
        ]);
        return { eonet, gdacs };
      }

      case "omniscope_space_satellites":
        return await apiFetch("/space/satellites", { group: args.group || "weather" });

      case "omniscope_radar_modes":
        return await apiFetch("/radar/modes", {
          provider: args.provider || "nexrad",
          mode: args.mode || "composite"
        });

      default:
        throw new Error(`Tool '${name}' not implemented.`);
    }
  } catch (edgeErr) {
    // Graceful fallback to direct upstream open feeds
    try {
      return await directFallback(name, args);
    } catch (_) {
      throw edgeErr;
    }
  }
}

function sendResponse(id, result, error = null) {
  const response = { jsonrpc: "2.0", id };
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  process.stdout.write(JSON.stringify(response) + "\n");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (err) {
    sendResponse(null, null, { code: -32700, message: "Parse error: Invalid JSON" });
    return;
  }

  const { id, method, params } = request;

  try {
    if (method === "initialize") {
      sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false },
          prompts: { listChanged: false }
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION
        }
      });
      return;
    }

    if (method === "notifications/initialized") {
      return;
    }

    if (method === "ping") {
      sendResponse(id, {});
      return;
    }

    if (method === "tools/list") {
      sendResponse(id, { tools: TOOLS });
      return;
    }

    if (method === "tools/call") {
      const toolName = params && params.name;
      const toolArgs = (params && params.arguments) || {};

      try {
        const result = await handleToolCall(toolName, toolArgs);
        sendResponse(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ],
          isError: false
        });
      } catch (err) {
        sendResponse(id, {
          content: [
            {
              type: "text",
              text: `Error executing tool '${toolName}': ${err.message}`
            }
          ],
          isError: true
        });
      }
      return;
    }

    // Unknown method
    sendResponse(id, null, { code: -32601, message: `Method not found: ${method}` });
  } catch (fatalErr) {
    sendResponse(id, null, { code: -32603, message: `Internal error: ${fatalErr.message}` });
  }
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
