/* global addEventListener, Response, fetch */

// https://f-droid-build.cuzi.workers.dev/{package}/

const fetchConfig = {
  cf: {
    // Always cache this fetch regardless of content type
    // for a max of 60min before revalidating the resource
    cacheTtl: 60 * 60,
    cacheEverything: true
  }
}
const responseConfig = {
  headers: {
    'content-type': 'application/javascript;charset=UTF-8',
    'source-code': 'github.com/cvzi/ScreenshotTile_miscellaneous/cloudflare/FDroidSuggestedRelease.js'
  }
}

async function getLatestFdroidRelease (packageName) {
  const url = `https://f-droid.org/packages/${encodeURIComponent(packageName)}/`
  const content = await (await fetch(url, fetchConfig)).text()
  const suggstedVersion = content.split('name="suggested"', 2)[1]
    .split('</div>', 2)[0]
    .split('name="', 3)
    .slice(1)
    .map(function (s) {
      return s.split('"')[0].trim()
    })
  return 'suggestedFdroidRelease(' + JSON.stringify(suggstedVersion) + ')'
}

async function handleRequest (request) {
  const { pathname } = new URL(request.url)
  const packageName = pathname.replace(/^\/|\/$/g, '').trim()
  if (packageName) {
    const latestVersion = await getLatestFdroidRelease(packageName)
    return new Response(latestVersion, responseConfig)
  } else {
    return new Response(`console.log("No package name found in '${request.url}'")`, Object.assign({
      status: 400
    }, responseConfig))
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
