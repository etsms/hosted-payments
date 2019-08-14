param(
  [string]$workspace=$env:WORKSPACE,
  [ValidateSet("dotnetcore","other", "vb6")]
  [string]$buildType,
  [string]$buildName,
  [string]$version
)

@"
Starting build.ps1...
**************************************************************
**************************************************************
**
** build script: build.ps1
**
**************************************************************
**************************************************************
**
** Navigating to workspace dir: $workspace
**
"@
Set-Location $workspace

"Finishing build.ps1..."
