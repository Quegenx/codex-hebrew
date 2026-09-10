param(
 [Parameter(Mandatory)][string]$Setup,
 [Parameter(Mandatory)][string]$SourceExecutable,
 [Parameter(Mandatory)][string]$TestRoot
)
$ErrorActionPreference = 'Stop'
$Setup = (Resolve-Path -LiteralPath $Setup).Path
$SourceExecutable = (Resolve-Path -LiteralPath $SourceExecutable).Path
if (Test-Path -LiteralPath $TestRoot) { throw 'Choose a new task-local verification directory.' }
$TestRoot = [IO.Path]::GetFullPath($TestRoot)
New-Item -ItemType Directory -Path $TestRoot | Out-Null
function Run-Setup([string[]]$Arguments) {
 $start = [Diagnostics.ProcessStartInfo]::new($Setup)
 $start.UseShellExecute = $false
 $start.CreateNoWindow = $true
 $start.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
 foreach ($argument in $Arguments) { if ($argument.Contains('"')) { throw 'Unexpected quote in an installer argument' } }
 $start.Arguments = ($Arguments | ForEach-Object { '"' + $_ + '"' }) -join ' '
 $process = [Diagnostics.Process]::Start($start)
 $process.WaitForExit()
 return $process.ExitCode
}
$sourceAsar = Join-Path (Split-Path $SourceExecutable) 'resources\app.asar'
$originalHash = (Get-FileHash -LiteralPath $sourceAsar -Algorithm SHA256).Hash
$description = Join-Path $TestRoot 'payload.json'
if ((Run-Setup @('--describe', $description)) -ne 0) { throw 'Installer description failed' }
$payload = Get-Content -LiteralPath $description -Raw -Encoding UTF8 | ConvertFrom-Json
$destination = Join-Path $TestRoot 'codex-hebrew-test-installed'
$firstReport = Join-Path $TestRoot 'fresh-install.json'
if ((Run-Setup @('--install-test', $SourceExecutable, $destination, $firstReport)) -ne 0) { throw (Get-Content -LiteralPath $firstReport -Raw -Encoding UTF8) }
$installedAsar = Join-Path $destination 'app\resources\app.asar'
if ((Get-FileHash -LiteralPath $installedAsar -Algorithm SHA256).Hash -ne $payload.outputArchiveSha256) { throw 'Installed ASAR does not match the build' }
foreach ($entry in $payload.files.PSObject.Properties) {
 if ((Get-FileHash -LiteralPath (Join-Path $destination $entry.Name) -Algorithm SHA256).Hash -ne $entry.Value) { throw ('Installed payload differs: ' + $entry.Name) }
}
if (Test-Path -LiteralPath (Join-Path $destination 'shared-data.json')) { throw 'Fresh isolated install unexpectedly shares data' }
Write-Host 'PASS: fresh EXE installation and all payload checksums'

# Simulate a user's existing shared-data choice, without touching real profiles.
$profile = Join-Path $TestRoot 'external profile'
$data = Join-Path $TestRoot 'external codex home'
New-Item -ItemType Directory -Path $profile,$data | Out-Null
$sentinel = Join-Path $data 'conversation.txt'
[IO.File]::WriteAllText($sentinel, 'Keep this conversation fixture unchanged')
$shared = Join-Path $destination 'shared-data.json'
[IO.File]::WriteAllText($shared, (@{codexHome=$data;userDataPath=$profile} | ConvertTo-Json))
$sharedHash = (Get-FileHash -LiteralPath $shared).Hash
$sentinelHash = (Get-FileHash -LiteralPath $sentinel).Hash
$updateReport = Join-Path $TestRoot 'update.json'
if ((Run-Setup @('--install-test', $SourceExecutable, $destination, $updateReport)) -ne 0) { throw (Get-Content -LiteralPath $updateReport -Raw -Encoding UTF8) }
if ((Get-FileHash -LiteralPath $shared).Hash -ne $sharedHash -or (Get-FileHash -LiteralPath $sentinel).Hash -ne $sentinelHash) { throw 'Update changed shared-data settings or history' }
if (Test-Path -LiteralPath ($destination + '.previous')) { throw 'Completed update left an application backup' }
Write-Host 'PASS: EXE update preserves shared paths and external conversation fixture'

$invalid = Join-Path $TestRoot 'unsupported source'
New-Item -ItemType Directory -Path (Join-Path $invalid 'resources') | Out-Null
[IO.File]::WriteAllText((Join-Path $invalid 'ChatGPT.exe'), 'Not executable; fixture only')
[IO.File]::WriteAllText((Join-Path $invalid 'resources\app.asar'), 'Unsupported version')
$rejectedDestination = Join-Path $TestRoot 'codex-hebrew-test-rejected'
$rejection = Join-Path $TestRoot 'rejected.json'
if ((Run-Setup @('--install-test', (Join-Path $invalid 'ChatGPT.exe'), $rejectedDestination, $rejection)) -eq 0) { throw 'Unsupported source was accepted' }
if (Test-Path -LiteralPath $rejectedDestination) { throw 'Unsupported source created an installation' }
if ((Get-FileHash -LiteralPath $sourceAsar -Algorithm SHA256).Hash -ne $originalHash) { throw 'Original application changed' }
$result = @{passed=$true;freshInstall=$true;update=$true;sharedDataPreserved=$true;unsupportedSourceRejected=$true;originalAsarUnchanged=$true;shellIntegration='not modified by acceptance mode';application=$destination;installerSha256=(Get-FileHash -LiteralPath $Setup -Algorithm SHA256).Hash}
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $TestRoot 'verification.json') -Encoding UTF8
$result | ConvertTo-Json
