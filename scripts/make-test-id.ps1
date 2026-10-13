Add-Type -AssemblyName System.Drawing

function New-IdCard([string]$Path, [string[]]$Lines) {
  $bmp = New-Object System.Drawing.Bitmap 1000, 620
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $brushNavy = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(11, 31, 58))
  $g.FillRectangle($brushNavy, 0, 0, 1000, 80)
  $titleFont = New-Object System.Drawing.Font "Arial", 18, ([System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font "Arial", 20, ([System.Drawing.FontStyle]::Regular)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $black = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Black)
  $g.DrawString("Iraqi National ID - EMIS Test", $titleFont, $white, 20, 24)
  $y = 110
  foreach ($line in $Lines) {
    $g.DrawString($line, $bodyFont, $black, 40, $y)
    $y += 48
  }
  $dir = Split-Path $Path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $brushNavy.Dispose(); $white.Dispose(); $black.Dispose()
  Write-Output $Path
}

$base = Join-Path $PSScriptRoot "..\test-assets"
New-IdCard (Join-Path $base "student-front.png") @(
  "Name: Ahmed Ali Mohammed Hassan",
  "Surname: Al-Aboudi",
  "Father Name: Ali",
  "Mother Name: Fatima Kadhim Jassim",
  "DoB: 15/03/2015",
  "Sex: M",
  "Place of Birth: Maysan",
  "Blood: O+",
  "National ID: 199012345678"
)
New-IdCard (Join-Path $base "student-back.png") @(
  "National ID: 199012345678",
  "Blood: O+"
)
New-IdCard (Join-Path $base "father-front.png") @(
  "Name: Ali Mohammed Hassan Kareem",
  "Surname: Al-Aboudi",
  "Sex: M"
)
New-IdCard (Join-Path $base "mother-front.png") @(
  "Name: Fatima Kadhim Jassim Obaid",
  "Father Name: Kadhim Jassim",
  "Sex: F"
)
New-IdCard (Join-Path $base "residence-front.png") @(
  "District: Al-Amarah",
  "Neighborhood: Al-Wahda",
  "Locality: 214",
  "Alley: 12",
  "House Number: 8",
  "Landmark: Near Qatar School"
)
New-IdCard (Join-Path $base "student-photo.png") @("Student Photo Placeholder")
New-IdCard (Join-Path $base "blank.png") @("Document Back Placeholder")
Write-Output "done"
