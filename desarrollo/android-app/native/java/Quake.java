package gt.quakealert.alarma;

import org.json.JSONObject;

import java.util.Locale;

/** Un sismo tal como lo publica server.js (/api/stream evento "quake" y /api/quakes/recent). */
final class Quake {
    String id = "";
    String place = "Sismo";
    double mag, lat, lng, depth;
    long time;
    int distanceKm;          // desde la ubicación configurada del usuario
    String bearing = "";     // rumbo desde el usuario hacia el epicentro

    static Quake parse(JSONObject o, double userLat, double userLng) {
        if (o == null) return null;
        Quake q = new Quake();
        q.id = o.optString("id", "");
        q.place = o.optString("place", "Sismo");
        q.mag = o.optDouble("mag", Double.NaN);
        q.lat = o.optDouble("lat", Double.NaN);
        q.lng = o.optDouble("lng", Double.NaN);
        q.depth = o.optDouble("depth", 0);
        q.time = o.optLong("time", 0);
        if (q.id.isEmpty() || Double.isNaN(q.mag) || Double.isNaN(q.lat) || Double.isNaN(q.lng)) return null;
        q.distanceKm = distKm(userLat, userLng, q.lat, q.lng);
        q.bearing = bearing(userLat, userLng, q.lat, q.lng);
        return q;
    }

    /** Simulacro de demostración: sismo M6.2 cerca de Escuintla. */
    static Quake test() {
        Quake q = new Quake();
        q.id = "sim-" + System.currentTimeMillis();
        q.place = "Simulacro · Escuintla, Guatemala";
        q.mag = 6.2;
        q.lat = 14.30;
        q.lng = -90.78;
        q.depth = 24;
        q.distanceKm = 48;
        q.bearing = "SO";
        q.time = System.currentTimeMillis();
        return q;
    }

    String magLabel() { return String.format(Locale.US, "%.1f", mag); }

    String detail() {
        return place + " — " + distanceKm + " km" + (bearing.isEmpty() ? "" : ", rumbo " + bearing);
    }

    static int distKm(double aLat, double aLng, double bLat, double bLng) {
        double r = 6371, dLat = Math.toRadians(bLat - aLat), dLng = Math.toRadians(bLng - aLng);
        double h = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(aLat)) * Math.cos(Math.toRadians(bLat)) * Math.pow(Math.sin(dLng / 2), 2);
        return (int) Math.round(2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
    }

    static String bearing(double aLat, double aLng, double bLat, double bLng) {
        double y = Math.sin(Math.toRadians(bLng - aLng)) * Math.cos(Math.toRadians(bLat));
        double x = Math.cos(Math.toRadians(aLat)) * Math.sin(Math.toRadians(bLat))
                - Math.sin(Math.toRadians(aLat)) * Math.cos(Math.toRadians(bLat)) * Math.cos(Math.toRadians(bLng - aLng));
        double deg = (Math.toDegrees(Math.atan2(y, x)) + 360) % 360;
        String[] p = {"N", "NE", "E", "SE", "S", "SO", "O", "NO"};
        return p[(int) (Math.round(deg / 45) % 8)];
    }
}
