/* global FDROID_CACHE, Event, addEventListener, Response, fetch */

// http://f-droid-build.cuzi.workers.dev/{package}/

/*

Requires a KV storage bound to the variable FDROID_CACHE

*/

const fetchConfig = {
  cf: {
    // Always cache this fetch regardless of content type
    // for a max of 10min before revalidating the resource
    cacheTtl: 10 * 60,
    cacheEverything: true
  }
}

const responseConfig = {
  headers: {
    'content-type': 'application/json;charset=UTF-8',
    'source-code': 'github.com/cvzi/ScreenshotTile_miscellaneous/cloudflare/FDroidBuildBadge.js',
    'Cache-Control': 's-maxage=600'
  }
}

async function cachedFetchJSON (url, fetchConfig, event) {
  let data = await FDROID_CACHE.get(url, { type: 'json' })
  if (!data) {
    data = await (await fetch(url, fetchConfig)).text()
    if (event instanceof Event) {
      event.waitUntil(FDROID_CACHE.put(url, data, { expirationTtl: 1800 }))
    } else {
      await FDROID_CACHE.put(url, data, { expirationTtl: 1800 })
    }
    data = JSON.parse(data)
  } else {
    console.log('Cache hit: ' + url)
  }
  return data
}

function findBuild (data, packageName) {
  if ('failedBuilds' in data && packageName in data.failedBuilds) {
    return -1
  }
  return 'successfulBuilds' in data && data.successfulBuilds.filter(v => v.id === packageName)
}

async function getRunningBuild (packageName, event) {
  const url = 'https://f-droid.org/repo/status/running.json'
  const data = await cachedFetchJSON(url, fetchConfig, event)
  return findBuild(data, packageName)
}

async function getLastBuild (packageName, event) {
  const url = 'https://f-droid.org/repo/status/build.json'
  const data = await cachedFetchJSON(url, fetchConfig, event)
  return findBuild(data, packageName)
}

async function getNeedsUpdate (packageName, event) {
  const url = 'https://f-droid.org/repo/status/update.json'
  const data = await cachedFetchJSON(url, fetchConfig, event)
  return 'needsUpdate' in data && data.needsUpdate.some(v => v === packageName)
}

async function badge (packageName, event) {
  const response = {
    schemaVersion: 1,
    label: 'F-Droid Build',
    cacheSeconds: 600
  }
  let builds = await getRunningBuild(packageName, event)
  if (!builds) {
    builds = await getLastBuild(packageName, event)
  }
  if (builds === -1) {
    response.message = 'Failed'
    response.color = 'red'
  } else if (!builds || builds.length === 0) {
    const needsUpdate = await getNeedsUpdate(packageName, event)
    if (needsUpdate) {
      response.message = 'Waiting for build'
      response.color = 'blue'
    } else {
      response.message = 'No builds'
      response.color = 'silver'
    }
  } else {
    response.message = 'Succeeded: ' + builds.map(v => v.CurrentVersion).join(', ')
    response.color = 'green'
  }
  return JSON.stringify(response)
}

async function handleRequest (event) {
  const { pathname } = new URL(event.request.url)
  const packageName = pathname.replace(/^\/|\/$/g, '').trim()
  if (packageName && packageName.length > 3) {
    return new Response(await badge(packageName, event), responseConfig)
  } else {
    return new Response(JSON.stringify({
      schemaVersion: 1,
      label: 'Error',
      message: 'No package name',
      color: 'orange'
    }, null, 2), responseConfig)
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})
