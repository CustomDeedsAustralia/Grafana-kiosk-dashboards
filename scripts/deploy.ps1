[CmdletBinding()]
param(
    [string[]]$Dashboard = @(
        "dashboards/computer-room/dashboard.json",
        "dashboards/energy-flow/dashboard.json",
        "dashboards/unifi-usw24/dashboard.json"
    )
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env"

if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match "^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$" -and $Matches[2]) {
            [Environment]::SetEnvironmentVariable(
                $Matches[1],
                $Matches[2].Trim("'`""),
                "Process"
            )
        }
    }
}

if (-not $env:GRAFANA_URL) {
    throw "Set GRAFANA_URL in .env or in the current environment."
}
if (-not $env:GRAFANA_SERVICE_ACCOUNT_TOKEN) {
    throw "Set GRAFANA_SERVICE_ACCOUNT_TOKEN in .env or in the current environment."
}

$headers = @{
    Authorization = "Bearer $($env:GRAFANA_SERVICE_ACCOUNT_TOKEN)"
    "Content-Type" = "application/json"
}
$endpoint = "$($env:GRAFANA_URL.TrimEnd('/'))/api/dashboards/db"

foreach ($relativePath in $Dashboard) {
    $path = Join-Path $repoRoot $relativePath
    if (-not (Test-Path $path)) {
        throw "Dashboard payload not found: $relativePath. Run npm run build first."
    }

    Invoke-RestMethod `
        -Uri $endpoint `
        -Method Post `
        -Headers $headers `
        -InFile $path | Out-Null

    Write-Host "Deployed $relativePath"
}
