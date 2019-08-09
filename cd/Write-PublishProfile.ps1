function Write-PublishProfile {

  param(
    [string]$workspace=$env:WORKSPACE,
    [string]$buildName,
    [string]$deployLocation,
    [string]$publishTargetFramework,
    [string]$publishRuntime
    )
    
    $pubxmlLocation = "$workspace\$buildName\Properties\PublishProfiles\$buildName.pubxml"
    
    Write-Host "Creating .pubxml here: $pubxmlLocation"

    New-Item $pubxmlLocation -Force -ItemType File | Out-Null
    
    $publishGuid = (New-Guid).Guid
    
@"
<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="4.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <WebPublishMethod>MSDeploy</WebPublishMethod>
    <LastUsedBuildConfiguration>Release</LastUsedBuildConfiguration>
    <LastUsedPlatform>Any CPU</LastUsedPlatform>
    <LaunchSiteAfterPublish>True</LaunchSiteAfterPublish>
    <ExcludeApp_Data>False</ExcludeApp_Data>
    <TargetFramework>${publishTargetFramework}</TargetFramework>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <ProjectGuid>${publishGuid}</ProjectGuid>
    <SelfContained>True</SelfContained>
    <_IsPortable>True</_IsPortable>
    <MSDeployServiceURL>${deployLocation}.scm.azurewebsites.net:443</MSDeployServiceURL>
    <DeployIisAppPath>${deployLocation}</DeployIisAppPath>
    <RemoteSitePhysicalPath />
    <SkipExtraFilesOnServer>True</SkipExtraFilesOnServer>
    <MSDeployPublishMethod>WMSVC</MSDeployPublishMethod>
    <EnableMSDeployBackup>True</EnableMSDeployBackup>
    <AllowUntrustedCertificate>True</AllowUntrustedCertificate>
    <UserName>azure_devops</UserName>
  </PropertyGroup>
</Project>
"@ | Set-Content $pubxmlLocation -Force
    
}
