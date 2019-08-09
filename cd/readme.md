# Continuous Delivery/Deployment (CD)

This folder contains the required scripts to provide continuous delivery for the current project.

## Project Specific CD Stuff

* hosted-payments.js tracks releases here: ...
* hosted-payments.js deploys to dev here: ...
* hosted-payments.js deploys to stg here: ...
* hosted-payments.js deploys to prd here: ...
* hosted-payments.js jira here: ...

## What's in here

Our current pipeline is running
 in [jenkins](https://svdlknxtgapp03.servers.global.prv/jenkins/)
 and when that ceases to be true, this file and
 all of the other affected files should be updated
 with the new system/build information.

Jenkins has a pipeline feature that utilizes a
 `Jenkinsfile` which contains all of the build/pipeline
 information. Below are the file/script explanations:

* Jenkinsfile
  * responsible for orchestrating all of the script files (this should do as little custom jenkins stuff as possible!)
* deploy.ps1
  * deploys current project to a specified location
* release.ps1
  * bumps version, updates confluence, emails concerned parties, ...

## Why

Most of our projects have migrated to/from **five** different
 build systems. The most painful part of migrating from build
 systems is the system-specific garbage that tends to be the
 'quick solution'. Keeping our CI/CD processes scripted and
 version controlled will give us a better handle on everything.
 Migrating will be easier and our deployments will be more adaptable.
