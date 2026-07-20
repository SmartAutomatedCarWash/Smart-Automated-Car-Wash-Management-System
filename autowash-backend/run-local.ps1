# Run AutoWash backend locally on :8080.
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $here ".env"
$jdk21 = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"

if (Test-Path $jdk21) {
  $env:JAVA_HOME = $jdk21
  $env:Path = "$jdk21\bin;$env:Path"
}

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
      return
    }
    $separatorIndex = $line.IndexOf("=")
    if ($separatorIndex -lt 1) {
      return
    }
    $name = $line.Substring(0, $separatorIndex).Trim()
    $value = $line.Substring($separatorIndex + 1).Trim()
    Set-Item -Path "Env:$name" -Value $value
  }
}

Set-Location $here

Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 2

Write-Host "Starting backend on http://localhost:8080 ..."
cmd /c "mvnw.cmd -Dmaven.test.skip=true clean spring-boot:run"
