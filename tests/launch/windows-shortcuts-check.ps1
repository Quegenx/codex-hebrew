param([Parameter(Mandatory)][string]$TestRoot)
$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath $TestRoot) { throw 'Use a new task-local test directory.' }
$app = Join-Path $TestRoot 'application with spaces'
$shortcuts = Join-Path $TestRoot 'shortcuts'
New-Item -ItemType Directory -Path $shortcuts, (Join-Path $app 'app\resources\hebrew-runtime') -Force | Out-Null
Set-Content -LiteralPath (Join-Path $app 'Codex Hebrew.exe') -Value 'fixture; never executed'
Set-Content -LiteralPath (Join-Path $app 'app\resources\hebrew-runtime\app.ico') -Value 'fixture'

# Reuse an existing Codex property store without changing the real shortcut.
$template = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\Codex.lnk'
if (!(Test-Path -LiteralPath $template)) { throw 'This Windows integration check requires an existing Codex shortcut.' }
$repair = Join-Path $PSScriptRoot '..\..\scripts\launch\repair-windows-shortcuts.ps1'
$shell = New-Object -ComObject WScript.Shell
$fixture = Join-Path $shortcuts 'Codex.lnk'
Copy-Item -LiteralPath $template -Destination $fixture
$link = $shell.CreateShortcut($fixture)
$link.TargetPath = Join-Path $app 'app\ChatGPT.exe'
$link.IconLocation = ',0'
$link.Save()
$unrelated = Join-Path $shortcuts 'Unrelated.lnk'
$other = $shell.CreateShortcut($unrelated)
$other.TargetPath = Join-Path $env:WINDIR 'notepad.exe'
$other.Save()
$before = (Get-FileHash -LiteralPath $fixture).Hash
$otherBefore = (Get-FileHash -LiteralPath $unrelated).Hash
& $repair -ApplicationRoot $app -ShortcutDirectories $shortcuts -WhatIf
if ((Get-FileHash -LiteralPath $fixture).Hash -ne $before) { throw 'WhatIf changed the shortcut.' }
$result = @(& $repair -ApplicationRoot $app -ShortcutDirectories $shortcuts)
if ($result.Count -ne 1 -or $result[0].AppId -ne 'com.openai.codex') { throw 'Expected one repaired Codex shortcut.' }
$updated = $shell.CreateShortcut($fixture)
if ($updated.TargetPath -ne (Join-Path $app 'Codex Hebrew.exe') -or $updated.IconLocation -ne ($updated.TargetPath + ',0')) { throw 'Shortcut target or icon mismatch.' }
if ((Get-FileHash -LiteralPath $result[0].Backup).Hash -ne $before) { throw 'Backup differs from the original shortcut.' }
if ((Get-FileHash -LiteralPath $unrelated).Hash -ne $otherBefore) { throw 'Unrelated shortcut changed.' }
$after = (Get-FileHash -LiteralPath $fixture).Hash
$second = @(& $repair -ApplicationRoot $app -ShortcutDirectories $shortcuts)
if ($second.Count -ne 0 -or (Get-FileHash -LiteralPath $fixture).Hash -ne $after) { throw 'Repeated repair was not idempotent.' }
Write-Host 'Windows shortcut checks passed: preview, identity, icon, backup, unrelated shortcuts, repeated run. No app was launched.'
