/*
https://gist.github.com/cvzi/e5d10613e50d2c4283c97fa1a861933e

Provides a badge for apps on the Google Play Store
The program parses the Play Store website and provides
data for https://shields.io/endpoint

This is run as a Cloudflare worker

Example: https://playstore.cuzi.workers.dev/org.mozilla.firefox
Badge: https://img.shields.io/endpoint?url=https%3A%2F%2Fplaystore.cuzi.workers.dev%2Forg.mozilla.firefox

*/

/* global addEventListener, Response, fetch */

async function getPlayStore (packageName) {
  const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&gl=US`
  const content = await (await fetch(url)).text()
  const parts = content.split('AF_initDataCallback({').slice(1).map(v => v.split('</script>')[0])
  const data = parts.filter(s => s.indexOf(`["${packageName}"],`) !== -1)[0].trim()
  let arr = data.split('data:', 2)[1].split('sideChannel:')[0].trim()
  arr = arr.substring(0, arr.length - 1) // remove trailing comma
  const json = JSON.parse(arr)

  // console.log(json[1][2])

  const result = {
    name: json[1][2][0],
    installs: json[1][2][13],
    version: json[1][2][140][0][0],
    lastUpdate: json[1][2][145][0][2],
    targetAndroid: json[1][2][140][1][0][0],
    minAndroid: json[1][2][140][1][1][0][0],
    rating: json[1][2][51][0],
    floatRating: json[1][2][51][0][1],
    contentRating: json[1][2][9][0],
    published: json[1][2][10][0]
  }

  // console.log(result)

  return result
}

async function handleRequest (request) {
  const init = {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'source-code': 'gist.github.com/cvzi/e5d10613e50d2c4283c97fa1a861933e'
    }
  }
  const { pathname } = new URL(request.url)
  const packageName = pathname.replace(/^\/|\/$/g, '').trim()
  if (packageName) {
    const app = await getPlayStore(packageName)
    return new Response(JSON.stringify({
      schemaVersion: 1,
      label: 'Play Store',
      message: `v${app.version}`
    }), init)
  } else {
    return new Response(JSON.stringify({
      schemaVersion: 1,
      label: 'Error',
      message: 'No package name',
      color: 'red'
    }, null, 2), init)
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
