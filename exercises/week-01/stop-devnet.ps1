$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$configRoot = Join-Path $repoRoot '.local\offckb\local\offckb-nodejs\Data\devnet'
$metadataPath = Join-Path $configRoot 'data\logs\daemon.pid'

if (-not (Test-Path -LiteralPath $metadataPath)) {
    Write-Output 'No daemon metadata found for this exercise.'
    return
}
$metadata = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
$daemonId = [int]$metadata.pid
if ($daemonId -le 0) { throw 'Invalid daemon PID.' }
$daemonProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $daemonId"
if (-not $daemonProcess) {
    Remove-Item -LiteralPath $metadataPath
    Write-Output 'Removed stale daemon metadata; the process is already stopped.'
    return
}
if ([IO.Path]::GetFileName($daemonProcess.ExecutablePath) -ne 'node.exe' -or
    [string]::IsNullOrWhiteSpace($metadata.scriptPath) -or
    $daemonProcess.CommandLine.IndexOf([string]$metadata.scriptPath, [StringComparison]::OrdinalIgnoreCase) -lt 0 -or
    $daemonProcess.CommandLine.IndexOf(' node ', [StringComparison]::Ordinal) -lt 0) {
    throw 'Daemon process does not match the recorded OffCKB command.'
}
$packagePath = Join-Path (Split-Path (Split-Path $metadata.scriptPath)) 'package.json'
$package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
if ($package.name -ne '@offckb/cli') { throw 'Recorded CLI is not an OffCKB package.' }
$children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $daemonId")
foreach ($childProcess in $children) {
    if ([IO.Path]::GetFileName($childProcess.ExecutablePath) -ne 'ckb.exe' -or
        $childProcess.CommandLine.IndexOf($configRoot, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw 'Unexpected child process; refusing to stop this process tree.'
    }
}
# Windows console processes need /F; limit termination to the verified tree.
& taskkill.exe /PID $daemonId /T /F
if ($LASTEXITCODE -ne 0) { throw 'Could not stop the verified process tree.' }
Start-Sleep -Milliseconds 500
if (Get-CimInstance Win32_Process -Filter "ProcessId = $daemonId") {
    throw 'Daemon process is still running.'
}
Remove-Item -LiteralPath $metadataPath
Write-Output 'Stopped the verified exercise Devnet. Chain data was kept.'
