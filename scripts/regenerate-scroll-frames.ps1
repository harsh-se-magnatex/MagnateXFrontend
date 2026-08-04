# Regenerate 3D scroll frames — motion-interpolated 60fps, upscaled 1080p.
# Place source video at: frontend/3d-website/videos/source.mp4
# Usage (from frontend/): .\scripts\regenerate-scroll-frames.ps1

$ErrorActionPreference = "Stop"
$frontendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$videosDir = Join-Path $frontendRoot "3d-website\videos"
$sourceVideo = Get-ChildItem $videosDir -Filter "*.mp4" -ErrorAction SilentlyContinue | Select-Object -First 1
$outDir = Join-Path $frontendRoot "3d-website\frames-jpg-hq"

if (-not $sourceVideo) {
  throw "No source video found. Add an .mp4 to: $videosDir"
}

if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

Write-Host "Source: $($sourceVideo.FullName)"
Write-Host "Output: $outDir"
Write-Host "Extracting 60fps with motion interpolation + 1080p upscale (this may take a few minutes)..."

Get-ChildItem $outDir -Filter "*.jpg" -ErrorAction SilentlyContinue | Remove-Item -Force

ffmpeg -y -i $sourceVideo.FullName -an `
  -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,scale=1920:1080:flags=lanczos" `
  -q:v 2 `
  "$outDir\frame_%06d.jpg"

$count = (Get-ChildItem $outDir -Filter "*.jpg").Count
Write-Host "Done. Generated $count frames at 1920x1080, 60fps (q:v 2)."
Write-Host "Update TOTAL_FRAMES in components/landing/landing-3d-background.tsx if the count changed."
