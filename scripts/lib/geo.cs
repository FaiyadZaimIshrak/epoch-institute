// Map geometry for scripts/make-basemap.ps1 and scripts/build-pages.ps1 (loaded with Add-Type).
// Equal Earth projection onto a 1000-unit-wide plane (y down, north up), Douglas-Peucker simplification,
// rectangle clipping and compact SVG path data.
using System; using System.Collections.Generic; using System.Globalization; using System.Text;
namespace EpochGeo {
public static class G {
  const double A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796;
  static readonly double M = Math.Sqrt(3) / 2;
  public const double W = 1000;
  public static readonly double S, H, XMAX, YMAX;
  static G() { XMAX = Math.PI / (M * A1); YMAX = Raw(0, 90)[1]; S = W / (2 * XMAX); H = 2 * YMAX * S; }
  static double[] Raw(double lng, double lat) {
    double lam = lng * Math.PI / 180, phi = lat * Math.PI / 180;
    double l = Math.Asin(M * Math.Sin(phi)), l2 = l * l, l6 = l2 * l2 * l2;
    double x = lam * Math.Cos(l) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)));
    double y = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2));
    return new[] { x, y };
  }
  // longitude/latitude in degrees -> plane units (0..1000, 0..H)
  public static double[] P(double lng, double lat) { var r = Raw(lng, lat); return new[] { W / 2 + r[0] * S, H / 2 - r[1] * S }; }

  // Douglas-Peucker for a flat ring [x0,y0,x1,y1,...] (closed: first point repeated at the end)
  public static double[] Simplify(double[] p, double tol) {
    int n = p.Length / 2; if (n <= 4 || tol <= 0) return p;
    var keep = new bool[n]; keep[0] = keep[n - 1] = true;
    int far = 0; double best = -1;
    for (int i = 1; i < n - 1; i++) { double dx = p[2 * i] - p[0], dy = p[2 * i + 1] - p[1], d = dx * dx + dy * dy; if (d > best) { best = d; far = i; } }
    keep[far] = true;
    var st = new Stack<int[]>(); st.Push(new[] { 0, far }); st.Push(new[] { far, n - 1 });
    double t2 = tol * tol;
    while (st.Count > 0) {
      var s = st.Pop(); int a = s[0], b = s[1]; if (b - a < 2) continue;
      double ax = p[2 * a], ay = p[2 * a + 1], bx = p[2 * b], by = p[2 * b + 1], vx = bx - ax, vy = by - ay, len2 = vx * vx + vy * vy;
      int idx = -1; double dmax = -1;
      for (int i = a + 1; i < b; i++) {
        double px = p[2 * i] - ax, py = p[2 * i + 1] - ay, d;
        if (len2 == 0) d = px * px + py * py;
        else { double t = (px * vx + py * vy) / len2; if (t < 0) t = 0; else if (t > 1) t = 1; double qx = px - t * vx, qy = py - t * vy; d = qx * qx + qy * qy; }
        if (d > dmax) { dmax = d; idx = i; }
      }
      if (dmax > t2) { keep[idx] = true; st.Push(new[] { a, idx }); st.Push(new[] { idx, b }); }
    }
    var o = new List<double>(); for (int i = 0; i < n; i++) if (keep[i]) { o.Add(p[2 * i]); o.Add(p[2 * i + 1]); }
    return o.ToArray();
  }
  // Sutherland-Hodgman clip of a ring to a rectangle (edges along the rectangle may remain)
  public static double[] Clip(double[] p, double x0, double y0, double x1, double y1) {
    var pts = new List<double>(p);
    for (int edge = 0; edge < 4 && pts.Count >= 6; edge++) {
      var o = new List<double>(); int n = pts.Count / 2;
      for (int i = 0; i < n; i++) {
        double cx = pts[2 * i], cy = pts[2 * i + 1], px = pts[2 * ((i + n - 1) % n)], py = pts[2 * ((i + n - 1) % n) + 1];
        bool cin = Inside(edge, cx, cy, x0, y0, x1, y1), pin = Inside(edge, px, py, x0, y0, x1, y1);
        if (cin) { if (!pin) { var q = Cut(edge, px, py, cx, cy, x0, y0, x1, y1); o.Add(q[0]); o.Add(q[1]); } o.Add(cx); o.Add(cy); }
        else if (pin) { var q = Cut(edge, px, py, cx, cy, x0, y0, x1, y1); o.Add(q[0]); o.Add(q[1]); }
      }
      pts = o;
    }
    return pts.ToArray();
  }
  static bool Inside(int e, double x, double y, double x0, double y0, double x1, double y1) { return e == 0 ? x >= x0 : e == 1 ? x <= x1 : e == 2 ? y >= y0 : y <= y1; }
  static double[] Cut(int e, double ax, double ay, double bx, double by, double x0, double y0, double x1, double y1) {
    double t;
    if (e == 0) { t = (x0 - ax) / (bx - ax); return new[] { x0, ay + t * (by - ay) }; }
    if (e == 1) { t = (x1 - ax) / (bx - ax); return new[] { x1, ay + t * (by - ay) }; }
    if (e == 2) { t = (y0 - ay) / (by - ay); return new[] { ax + t * (bx - ax), y0 }; }
    t = (y1 - ay) / (by - ay); return new[] { ax + t * (bx - ax), y1 };
  }
  public static double[] Bbox(double[] p) {
    double a = double.MaxValue, b = double.MaxValue, c = double.MinValue, d = double.MinValue;
    for (int i = 0; i < p.Length; i += 2) { if (p[i] < a) a = p[i]; if (p[i] > c) c = p[i]; if (p[i + 1] < b) b = p[i + 1]; if (p[i + 1] > d) d = p[i + 1]; }
    return new[] { a, b, c, d };
  }
  public static double Area(double[] p) { double s = 0; int n = p.Length / 2; for (int i = 0; i < n; i++) { int j = (i + 1) % n; s += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; } return Math.Abs(s) / 2; }
  public static string IntJson(double[] p, double f) {
    var sb = new StringBuilder(p.Length * 6).Append('[');
    for (int i = 0; i < p.Length; i++) { if (i > 0) sb.Append(','); sb.Append(((long)Math.Round(p[i] * f)).ToString(CultureInfo.InvariantCulture)); }
    return sb.Append(']').ToString();
  }
  public static string Num(double v, int dec) {
    string s = Math.Round(v, dec).ToString("F" + dec, CultureInfo.InvariantCulture);
    if (s.IndexOf('.') >= 0) s = s.TrimEnd('0').TrimEnd('.');
    if (s == "-0") s = "0"; return s;
  }
  // one ring -> "M x y l dx dy ... z" (relative steps from rounded points; repeated points dropped)
  public static void Ring(StringBuilder sb, double[] p, int dec) { Ring(sb, p, dec, 1); }
  public static void Ring(StringBuilder sb, double[] p, int dec, double scale) {
    int n = p.Length / 2; if (n < 3) return;
    double f = Math.Pow(10, dec); long px = 0, py = 0; int k = 0; var tmp = new StringBuilder();
    for (int i = 0; i < n; i++) {
      long x = (long)Math.Round(p[2 * i] * scale * f), y = (long)Math.Round(p[2 * i + 1] * scale * f);
      if (k > 0 && x == px && y == py) continue;
      if (k == 0) tmp.Append('M').Append(Num(x / f, dec)).Append(' ').Append(Num(y / f, dec)).Append('l');
      else { long dx = x - px, dy = y - py; if (k > 1 && dx >= 0) tmp.Append(' '); tmp.Append(Num(dx / f, dec)); if (dy >= 0) tmp.Append(' '); tmp.Append(Num(dy / f, dec)); }
      px = x; py = y; k++;
    }
    if (k >= 3) sb.Append(tmp.ToString()).Append('z');
  }
  public static double[] FromInts(object[] a, double f) { var r = new double[a.Length]; for (int i = 0; i < a.Length; i++) r[i] = Convert.ToDouble(a[i], CultureInfo.InvariantCulture) / f; return r; }
  // rings (each a flat array) -> path data, optionally clipped to a rectangle and simplified
  public static string PathData(List<double[]> rings, double tol, int dec, double[] clip) { return PathData(rings, null, tol, dec, clip, 1); }
  public static string PathData(List<double[]> rings, List<double[]> boxes, double tol, int dec, double[] clip) { return PathData(rings, boxes, tol, dec, clip, 1); }
  // scale: written coordinates are multiplied by it (10 with dec 0 = tenths of a unit as whole numbers)
  public static string PathData(List<double[]> rings, List<double[]> boxes, double tol, int dec, double[] clip, double scale) {
    var sb = new StringBuilder();
    for (int ri = 0; ri < rings.Count; ri++) {
      double[] r = rings[ri];
      if (clip != null) {
        var bb = boxes != null ? boxes[ri] : Bbox(r); if (bb[2] < clip[0] || bb[0] > clip[2] || bb[3] < clip[1] || bb[1] > clip[3]) continue;
        if (bb[0] < clip[0] || bb[2] > clip[2] || bb[1] < clip[1] || bb[3] > clip[3]) { r = Clip(r, clip[0], clip[1], clip[2], clip[3]); if (r.Length < 6) continue; var c = new double[r.Length + 2]; Array.Copy(r, c, r.Length); c[r.Length] = r[0]; c[r.Length + 1] = r[1]; r = c; }
      }
      var bb2 = Bbox(r); if (Math.Max(bb2[2] - bb2[0], bb2[3] - bb2[1]) < tol * 1.5) continue;   // smaller than the detail kept: skip
      r = Simplify(r, tol); if (r.Length < 8) continue;
      Ring(sb, r, dec, scale);
    }
    return sb.ToString();
  }
  // graticule: parallels (straight in Equal Earth) and meridians every `step` degrees, as path data
  public static string Graticule(double step, double latMin, double latMax, int dec, double scale) {
    var sb = new StringBuilder();
    for (double lat = -90 + step; lat < 90; lat += step) {
      if (lat < latMin || lat > latMax) continue;
      var a = P(-180, lat); var b = P(180, lat);
      sb.Append('M').Append(Num(a[0] * scale, dec)).Append(' ').Append(Num(a[1] * scale, dec)).Append('H').Append(Num(b[0] * scale, dec));
    }
    for (double lng = -180; lng <= 180; lng += step) {
      bool first = true;
      for (double lat = latMin; lat <= latMax + 1e-9; lat += 2) {
        var p = P(lng, Math.Min(lat, latMax));
        sb.Append(first ? 'M' : 'L').Append(Num(p[0] * scale, dec)).Append(' ').Append(Num(p[1] * scale, dec)); first = false;
      }
    }
    return sb.ToString();
  }
  // outline of the map (the sphere's edge between two latitudes)
  public static string Outline(double latMin, double latMax, int dec, double scale) {
    var sb = new StringBuilder(); bool first = true;
    for (double lat = latMin; lat <= latMax + 1e-9; lat += 2) { var p = P(-180, Math.Min(lat, latMax)); sb.Append(first ? 'M' : 'L').Append(Num(p[0] * scale, dec)).Append(' ').Append(Num(p[1] * scale, dec)); first = false; }
    for (double lat = latMax; lat >= latMin - 1e-9; lat -= 2) { var p = P(180, Math.Max(lat, latMin)); sb.Append('L').Append(Num(p[0] * scale, dec)).Append(' ').Append(Num(p[1] * scale, dec)); }
    return sb.Append('Z').ToString();
  }
}
}
