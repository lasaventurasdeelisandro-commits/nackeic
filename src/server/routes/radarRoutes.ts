import { Router, Request, Response } from "express";
import { db } from "../db/index.ts";

export const radarRouter = Router();

// Calculate Haversine distance in kilometers between two GPS coordinates
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// GET /api/v1/radar/specialists
radarRouter.get("/specialists", async (req: Request, res: Response) => {
  try {
    const lat = parseFloat((req.query.lat as string) || "18.4861");
    const lng = parseFloat((req.query.lng as string) || "-69.9312");
    const radiusKm = parseFloat((req.query.radius as string) || "15.0");
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusKm)
      || Math.abs(lat) > 90 || Math.abs(lng) > 180 || radiusKm <= 0 || radiusKm > 200) {
      res.status(400).json({ error: "Ubicación o radio de búsqueda inválidos." });
      return;
    }
    const trade = (req.query.trade as string) || "todos";
    const sortBy = (req.query.sort as string) || "precio"; // 'precio' | 'rapido' | 'rating'

    let sql = `
      SELECT u.id, u.full_name as name, u.avatar_url as avatar, u.role,
             pp.trade, pp.credential_code, pp.bio, pp.experience_years, 
             pp.rating, pp.review_count, pp.hourly_rate as base_price,
             pp.verified, pp.lat, pp.lng, pp.is_available
      FROM users u
      JOIN professional_profiles pp ON u.id = pp.user_id
      WHERE u.status = 'active' AND pp.is_available = TRUE
    `;
    const params: any[] = [];

    if (trade && trade !== "todos") {
      params.push(trade);
      sql += ` AND pp.trade = $${params.length}`;
    }

    const result = await db.query(sql, params);

    // Compute distance, obfuscate exact coordinates for privacy compliance, and filter by radius
    const specialists = result.rows
      .map((pro: any) => {
        const distanceKm = calculateDistanceKm(lat, lng, pro.lat, pro.lng);
        const etaMinutes = Math.max(5, Math.round(distanceKm * 3.5)); // estimate 3.5 min per km

        // Calculate visual radar offset (-40% to 40% relative to center)
        const latDelta = (pro.lat - lat) * 111;
        const lngDelta = (pro.lng - lng) * 111;
        const latOffset = Math.min(85, Math.max(15, 50 + (latDelta / radiusKm) * 35));
        const lngOffset = Math.min(85, Math.max(15, 50 + (lngDelta / radiusKm) * 35));

        return {
          id: pro.id,
          name: pro.name,
          avatar: pro.avatar || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=256&q=80",
          trade: pro.trade,
          credentialCode: pro.credential_code,
          bio: pro.bio,
          rating: pro.rating,
          reviewCount: pro.review_count,
          basePrice: pro.base_price,
          verified: pro.verified,
          type: pro.role === "profesional" ? "profesional" : "tecnico",
          distanceKm,
          etaMin: etaMinutes,
          latOffset,
          lngOffset,
          badges: [
            pro.verified ? "Acreditado Oficial" : "Acreditación pendiente",
            `⭐ ${pro.rating} (${pro.review_count})`,
            pro.credential_code
          ]
        };
      })
      .filter((pro) => pro.distanceKm <= radiusKm);

    // Sort accordingly
    if (sortBy === "precio") {
      specialists.sort((a, b) => a.basePrice - b.basePrice);
    } else if (sortBy === "rapido") {
      specialists.sort((a, b) => a.etaMin - b.etaMin);
    } else if (sortBy === "rating") {
      specialists.sort((a, b) => b.rating - a.rating);
    }

    res.json(specialists);
  } catch (error: any) {
    console.error("[Radar Query Error]:", error);
    res.status(500).json({ error: "Error al escanear radar geoespacial" });
  }
});
