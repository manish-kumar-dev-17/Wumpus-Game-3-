$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-DataUri {
  param([string]$RelativePath)
  $fullPath = Join-Path $root $RelativePath
  $bytes = [System.IO.File]::ReadAllBytes($fullPath)
  $base64 = [Convert]::ToBase64String($bytes)
  return "data:image/svg+xml;base64,$base64"
}

$html = [System.IO.File]::ReadAllText((Join-Path $root "index.html"))
$css = [System.IO.File]::ReadAllText((Join-Path $root "styles.css"))
$js = [System.IO.File]::ReadAllText((Join-Path $root "app.js"))

$assetNames = @(
  "breeze.svg",
  "cave-floor.svg",
  "explorer.svg",
  "gold.svg",
  "pit.svg",
  "stench.svg",
  "wumpus.svg"
)

foreach ($assetName in $assetNames) {
  $assetPath = "assets/$assetName"
  $dataUri = Get-DataUri $assetPath
  $css = $css.Replace($assetPath, $dataUri)
  $js = $js.Replace($assetPath, $dataUri)
  $html = $html.Replace($assetPath, $dataUri)
}

$html = $html -replace '<link rel="stylesheet" href="styles.css">', "<style>`r`n$css`r`n</style>"
$html = $html -replace '<script src="app.js"></script>', "<script>`r`n$js`r`n</script>"
$html = $html.Replace('href="./wumpus-game-source.zip" download', 'href="#" title="Publish this file online to make a public source link"')

[System.IO.File]::WriteAllText((Join-Path $root "wumpus-standalone.html"), $html, [System.Text.UTF8Encoding]::new($false))
Write-Host "Created wumpus-standalone.html"
