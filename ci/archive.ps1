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

    $source = "$workspace\Debug"
    $destination = "$($buildName)-v$($version)-Debug+$($env:BUILD_NUMBER).zip"

    if (Test-Path $source) {
      "Zipping Development files from here: $($buildName)\Debug"
      "  To the destination: $($buildName)-v$($version)-Debug+$($env:BUILD_NUMBER).zip"
      Compress-Archive `
        -Path "$source\*" `
        -DestinationPath $destination
    }
  }
  other = {
@"
**
** running $buildType script block...
**
"@

    $source = "$workspace\$buildName\bin\Debug"
    $destination = "$($buildName)-v$($version)-Debug+$($env:BUILD_NUMBER).zip"

    if (Test-Path $source) {
      "Zipping Development files from here: $source\*"
      "  To the destination: $destination"
      Compress-Archive `
        -Path "$source\*" `
        -DestinationPath $destination
    }
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
