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


$scriptBlock = @{
  dotnetcore = {
@"
**
** running $buildType script block...
**
"@

    "Zipping Development files from here: $($buildName)\Debug"
    "  To the destination: $($buildName)-v$($version)-Debug+$($env:BUILD_NUMBER).zip"
    Compress-Archive `
      -Path ".\Debug\*" `
      -DestinationPath "$($buildName)-v$($version)-Debug+$($env:BUILD_NUMBER).zip"
  }
  other = {
@"
**
** running $buildType script block...
**
"@

    "Zipping Development files from here: $workspace\$buildName\bin\Debug\*"
    "  To the destination: $($buildName)-v$($version)-Debug+$($env:BUILD_NUMBER).zip"
    Compress-Archive `
      -Path "$workspace\$buildName\bin\Debug\*" `
      -DestinationPath "$($buildName)-v$($version)-Debug+$($env:BUILD_NUMBER).zip"
  }
  vb6 = {
@"
**
** running $buildType script block...
**
"@
  }
}

Invoke-Command $scriptBlock.$buildType


"Finishing archive.ps1..."
