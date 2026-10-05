# Build script to generate an installable WordPress plugin ZIP archive

$pluginDir = $PSScriptRoot
$tempDir = Join-Path $env:TEMP "dynamic-image-pointers"
$zipOutput = Join-Path (Split-Path $pluginDir -Parent) "dynamic-image-pointers.zip"

Write-Host "Packaging WP Dynamic Image Pointers..." -ForegroundColor Cyan

# 1. Prepare temporary directory with plugin slug
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# 2. Copy only distribution assets (excludes .git, .sql dumps, .json exports)
Copy-Item -Path (Join-Path $pluginDir "dynamic-image-pointers.php") -Destination $tempDir
Copy-Item -Path (Join-Path $pluginDir "assets") -Destination $tempDir -Recurse
if (Test-Path (Join-Path $pluginDir "README.md")) {
    Copy-Item -Path (Join-Path $pluginDir "README.md") -Destination $tempDir
}

# 3. Create ZIP archive
if (Test-Path $zipOutput) { Remove-Item -Force $zipOutput }
Compress-Archive -Path $tempDir -DestinationPath $zipOutput

# 4. Clean up temporary directory
Remove-Item -Recurse -Force $tempDir

$zipItem = Get-Item $zipOutput
Write-Host "Success! Created installable plugin package:" -ForegroundColor Green
Write-Host "Path: $($zipItem.FullName) ($([math]::Round($zipItem.Length / 1KB, 2)) KB)" -ForegroundColor Yellow
