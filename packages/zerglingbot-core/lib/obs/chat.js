// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Changes the settings for a Streamlabs chat widget source to turn debugging on/off.
 */
const setStreamlabsChatSettings = (settings, isDebugging = false) => {
  const url = new URL(settings.url)
  if (isDebugging) {
    url.searchParams.set('simulate', '1')
    url.searchParams.delete('_simulate')
  }
  else {
    url.searchParams.set('_simulate', '1')
    url.searchParams.delete('simulate')
  }
  return {
    ...settings,
    url: String(url)
  }
}

module.exports = {
  setStreamlabsChatSettings
}
