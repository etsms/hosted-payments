param(
  [string]$workspace=$env:WORKSPACE,
  [ValidateSet("dotnetcore","other", "vb6")]
  [string]$buildType,
  [string]$buildName,
  [string]$version
)

@"
Starting test.ps1...
**************************************************************
**************************************************************
**
** test script: test.ps1
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
  }
  other = {
@"
**
** running $buildType script block...
**
"@
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

"Finishing test.ps1..."
