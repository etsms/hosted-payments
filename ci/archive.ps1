param(
  [string]$workspace=$env:WORKSPACE,
  [ValidateSet("dotnetcore","other", "vb6")]
  [string]$buildType,
  [string]$buildName,
  [string]$version,
  [string]$buildOutput
)

@"
Starting archive.ps1...
**************************************************************
**************************************************************
**
** archive script: archive.ps1
**
**************************************************************
**************************************************************
**
** Navigating to workspace dir: $workspace
**
"@
Set-Location $workspace

@"
**
** running $buildType script block...
**
"@

$destination = "$($buildName)-v$($version)-Debug+$($env:BUILD_NUMBER).zip"

if (Test-Path $workspace) {
  "Zipping Development files from here: $workspace"
  "  To the destination: $destination"
  Get-ChildItem $workspace -Exclude @("ci","cd") | Compress-Archive -DestinationPath $destination
}

"Finishing archive.ps1..."
