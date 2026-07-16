# Regenerate 3D scroll frames from clip-2 + clip-1 (concatenated).
# Native 30fps at 4K (3840x2160) — no downscale, no frame interpolation.
# Place clip-2.mp4 and clip-1.mp4 in frontend/3d-website/videos/ before running.
# Usage (from frontend/): .\scripts\regenerate-scroll-frames.ps1

$ErrorActionPreference = "Stop"
$frontendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$videosDir = Join-Path $frontendRoot "3d-website\videos"
$outDir = Join-Path $frontendRoot "3d-website\frames-jpg-hq"
$outDirMobile = Join-Path $frontendRoot "3d-website\frames-jpg-mobile"

$clips = @(
  (Join-Path $videosDir "clip-2.mp4"),
  (Join-Path $videosDir "clip-1.mp4")
)

foreach ($clip in $clips) {
  if (-not (Test-Path $clip)) {
    throw "Missing clip: $clip"
  }
}

if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}
if (-not (Test-Path $outDirMobile)) {
  New-Item -ItemType Directory -Force -Path $outDirMobile | Out-Null
}

$listFile = Join-Path $env:TEMP "landing-clips-concat.txt"
$lines = $clips | ForEach-Object { "file '$_'" }
Set-Content -Path $listFile -Value $lines -Encoding ASCII

Write-Host "Clips (in order):"
$clips | ForEach-Object { Write-Host "  $_" }
Write-Host "Output: $outDir"
Write-Host "Concatenating + native 30fps at 4K (3840x2160)..."

Get-ChildItem $outDir -Filter "*.jpg" -ErrorAction SilentlyContinue | Remove-Item -Force

ffmpeg -y -f concat -safe 0 -i $listFile -an `
  -vf "scale=3840:2160:flags=lanczos,fps=30" `
  -q:v 2 `
  "$outDir\frame_%06d.jpg"

Write-Host "Generating lightweight mobile set (1280x720, 30fps)..."
Get-ChildItem $outDirMobile -Filter "*.jpg" -ErrorAction SilentlyContinue | Remove-Item -Force

ffmpeg -y -f concat -safe 0 -i $listFile -an `
  -vf "scale=1280:720:flags=lanczos,fps=30" `
  -q:v 5 `
  "$outDirMobile\frame_%06d.jpg"

$count = (Get-ChildItem $outDir -Filter "*.jpg").Count
$countMobile = (Get-ChildItem $outDirMobile -Filter "*.jpg").Count
Write-Host "Done. Desktop: $count frames @ 3840x2160 (q:v 2). Mobile: $countMobile frames @ 1280x720 (q:v 5)."
Write-Host "Update TOTAL_FRAMES in components/landing/landing-3d-background.tsx if the count changed."
