# Small copies of the encyclopedia, state and social-ladder pictures for the places that show them at 56 px or less (list tiles 44 px,
# result thumbnails 56 px, chart avatars 28 px): images/encyclopedia/thumbs/<slug>.jpg and images/states/thumbs/<id>.jpg,
# the shorter side 112 px (twice 56, for sharp phone screens), JPEG quality 80: about a quarter of the picture's bytes.
# The pages' bigger pictures keep the full files. build-pages.ps1 runs this first and links a thumb only where one
# exists. Re-runnable: only new or changed pictures are redone (a thumb older than its picture), thumbs of removed
# pictures are deleted, and a picture already that small is copied as it is.
#   powershell -File scripts\make-thumbs.ps1 [-Force]
param([string]$Repo = (Split-Path $PSScriptRoot), [int]$Short = 112, [int]$Quality = 80, [switch]$Force)
$ErrorActionPreference = 'Stop'
if (-not ('EpochThumbs' -as [type])) {
  Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
public static class EpochThumbs {
  static readonly ImageCodecInfo Jpeg = ImageCodecInfo.GetImageEncoders().First(c => c.MimeType == "image/jpeg");
  // EXIF orientation (0x0112) -> the turn that shows the picture upright, as browsers do
  static readonly RotateFlipType[] Turn = { RotateFlipType.RotateNoneFlipNone, RotateFlipType.RotateNoneFlipNone,
    RotateFlipType.RotateNoneFlipX, RotateFlipType.Rotate180FlipNone, RotateFlipType.Rotate180FlipX,
    RotateFlipType.Rotate90FlipX, RotateFlipType.Rotate90FlipNone, RotateFlipType.Rotate270FlipX, RotateFlipType.Rotate270FlipNone };
  public static string Run(string dir, int shortSide, long quality, bool force) {
    string th = Path.Combine(dir, "thumbs"); Directory.CreateDirectory(th);
    int made = 0, copied = 0, kept = 0, removed = 0; long inB = 0, outB = 0;
    var errs = new ConcurrentBag<string>();
    Parallel.ForEach(Directory.GetFiles(dir, "*.jpg"), new ParallelOptions { MaxDegreeOfParallelism = Math.Max(1, Environment.ProcessorCount - 1) }, src => {
      var si = new FileInfo(src); var di = new FileInfo(Path.Combine(th, si.Name));
      if (!force && di.Exists && di.LastWriteTimeUtc >= si.LastWriteTimeUtc) { Interlocked.Increment(ref kept); return; }
      string tmp = di.FullName + ".tmp";
      try {
        bool small;
        using (var img = Image.FromFile(src, true)) {
          if (img.PropertyIdList.Contains(0x0112)) { int o = img.GetPropertyItem(0x0112).Value[0]; if (o > 1 && o < 9) img.RotateFlip(Turn[o]); }
          int w = img.Width, h = img.Height;
          small = Math.Min(w, h) <= shortSide;
          if (!small) {
            double k = (double)shortSide / Math.Min(w, h);
            int nw = Math.Max(1, (int)Math.Round(w * k)), nh = Math.Max(1, (int)Math.Round(h * k));
            using (var bmp = new Bitmap(nw, nh, PixelFormat.Format24bppRgb))
            using (var g = Graphics.FromImage(bmp))
            using (var ia = new ImageAttributes())
            using (var ep = new EncoderParameters(1)) {
              g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality;
              g.CompositingQuality = CompositingQuality.HighQuality; g.SmoothingMode = SmoothingMode.HighQuality;
              ia.SetWrapMode(WrapMode.TileFlipXY);   // no dark fringe at the edges
              g.DrawImage(img, new Rectangle(0, 0, nw, nh), 0, 0, w, h, GraphicsUnit.Pixel, ia);
              ep.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, quality);
              bmp.Save(tmp, Jpeg, ep);
            }
          }
        }
        // a picture already that small, or one the thumb would not make lighter, is copied as it is
        if (small || new FileInfo(tmp).Length >= si.Length) { if (File.Exists(tmp)) File.Delete(tmp); File.Copy(src, tmp, true); Interlocked.Increment(ref copied); }
        else Interlocked.Increment(ref made);
        if (di.Exists) File.Delete(di.FullName);
        File.Move(tmp, di.FullName);
        Interlocked.Add(ref inB, si.Length); Interlocked.Add(ref outB, new FileInfo(di.FullName).Length);
      } catch (Exception e) {
        try { if (File.Exists(tmp)) File.Delete(tmp); } catch { }
        errs.Add(si.Name + ": " + e.Message);
      }
    });
    foreach (var t in Directory.GetFiles(th, "*.jpg")) if (!File.Exists(Path.Combine(dir, Path.GetFileName(t)))) { File.Delete(t); removed++; }
    string s = string.Format("{0}: {1} made, {2} copied (already small), {3} up to date, {4} removed", Path.GetFileName(dir), made, copied, kept, removed);
    if (made + copied > 0) s += string.Format(", {0:N1} MB -> {1:N1} MB", inB / 1048576.0, outB / 1048576.0);
    if (errs.Count > 0) s += "\n  failed: " + string.Join("\n  failed: ", errs.OrderBy(x => x));
    return s;
  }
}
'@
}
foreach ($d in 'encyclopedia', 'states', 'societies') {
  $dir = Join-Path $Repo "images\$d"
  if (Test-Path $dir) { [EpochThumbs]::Run($dir, $Short, $Quality, [bool]$Force) }
}
