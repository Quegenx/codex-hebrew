[CmdletBinding(SupportsShouldProcess)]
param(
 [Parameter(Mandatory)][string]$ApplicationRoot,
 [string[]]$ShortcutDirectories = @(
  [Environment]::GetFolderPath('Desktop'),
  (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'),
  (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar')
 )
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $ApplicationRoot).Path
$launcher = Join-Path $root 'Codex Hebrew.exe'
$runtimeIcon = Join-Path $root 'app\resources\hebrew-runtime\app.ico'
if (!(Test-Path -LiteralPath $launcher -PathType Leaf) -or !(Test-Path -LiteralPath $runtimeIcon -PathType Leaf)) {
 throw 'Select a built Codex Hebrew application directory.'
}
$allowedTargets = @($launcher, (Join-Path $root 'app\ChatGPT.exe'), (Join-Path $env:LOCALAPPDATA 'OpenAI\CodexRtl\app\Codex.exe'))
$shell = New-Object -ComObject WScript.Shell
$metadata = New-Object -ComObject Shell.Application
$changed = 0
foreach ($directory in $ShortcutDirectories) {
 if (!(Test-Path -LiteralPath $directory -PathType Container)) { continue }
 foreach ($file in Get-ChildItem -LiteralPath $directory -Filter '*.lnk' -File) {
  $link = $shell.CreateShortcut($file.FullName)
  $appId = $metadata.Namespace($directory).ParseName($file.Name).ExtendedProperty('System.AppUserModel.ID')
  if ($allowedTargets -notcontains $link.TargetPath -or $appId -ne 'com.openai.codex') { continue }
  if ($link.TargetPath -eq $launcher -and $link.IconLocation -eq ($launcher + ',0') -and !$link.Arguments) { continue }
  if (!$PSCmdlet.ShouldProcess($file.FullName, 'Use the Hebrew launcher and icon; preserve the application ID')) { continue }
  $backup = Join-Path $root ('shortcut-backups\' + [guid]::NewGuid().ToString('N') + '.lnk')
  New-Item -ItemType Directory -Path (Split-Path $backup) -Force | Out-Null
  Copy-Item -LiteralPath $file.FullName -Destination $backup
  $link.TargetPath = $launcher
  $link.WorkingDirectory = $root
  $link.Arguments = ''
  $link.IconLocation = $launcher + ',0'
  $link.Description = 'Codex בעברית'
  $link.Save()
  $verified = $shell.CreateShortcut($file.FullName)
  $verifiedId = $metadata.Namespace($directory).ParseName($file.Name).ExtendedProperty('System.AppUserModel.ID')
  if ($verifiedId -ne $appId -or $verified.TargetPath -ne $launcher -or $verified.IconLocation -ne ($launcher + ',0')) {
   Copy-Item -LiteralPath $backup -Destination $file.FullName
   throw "Shortcut verification failed; restored $($file.FullName)."
  }
  $changed++
  [pscustomobject]@{Shortcut=$file.FullName;Target=$verified.TargetPath;AppId=$verifiedId;Backup=$backup}
 }
}
Write-Host "Updated $changed shortcut(s). Close and reopen Codex Hebrew to reload its taskbar icon."
