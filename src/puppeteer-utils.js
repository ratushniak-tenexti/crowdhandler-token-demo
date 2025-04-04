const createCaptchaFrameInterceptor = resolve => async frame => {
  const element = await frame.frameElement()
  const nameOrId = await element.evaluate(f => f.name ?? f.id)

  if (nameOrId.startsWith('a-')) {
    resolve(frame)
  }
}

const createEventPageResponseInterceptor = (eventUrl, resolve) => response => {
  const isEventPage = response.url() === eventUrl.toString()

  if (isEventPage && response.status() === 200) {
    return resolve(response)
  }
}

const createWaitingRoomPageResponseInterceptor = (eventUrl, resolve) => response => {
  const url = new URL(response.url())
  const isWaitingRoom = url.hostname === eventUrl.hostname
    && url.searchParams.has('ch-public-key')

  if (isWaitingRoom && response.status() === 200) {
    return resolve(response)
  }
}

function resolveEventPageLoadingObstacles(page, eventUrl, log) {
  const { promise, resolve } = Promise.withResolvers()
  let isEventPageResolved = false
  let captchaAppearTimeout

  const captchaInterceptor = createCaptchaFrameInterceptor(frame => {
    log('Captcha frame detected!')
    clearTimeout(captchaAppearTimeout)

    const tasks = [
      () => frame.waitForSelector('div.recaptcha-checkbox-border'),
      () => page.findRecaptchas(),
      ({ captchas }) => page.getRecaptchaSolutions(captchas),
      ({ solutions }) => page.enterRecaptchaSolutions(solutions)
    ]

    tasks.reduce((result, task) =>
      result.then(arg => isEventPageResolved ? Promise.reject() : task(arg)),
      Promise.resolve()
    ).catch(_ => log('Some captcha steps were skipped'))
  })

  const waitingRoomPageInterceptor = createWaitingRoomPageResponseInterceptor(eventUrl, _ => {
    log('Waiting room page is loaded')

    return new Promise(resolve => {
      captchaAppearTimeout = setTimeout(() => {
        log('Captcha not appearing for too long. Reloading page...')
        page.reload().then(resolve)
      }, 15000)
    })
  })

  const eventPageInterceptor = createEventPageResponseInterceptor(eventUrl, response => {
    log('Event page is loaded')

    page.off('frameattached', captchaInterceptor)
    page.off('response', eventPageInterceptor)
    page.off('response', waitingRoomPageInterceptor)

    isEventPageResolved = true
    resolve(response)
  })

  page.on('response', eventPageInterceptor)
  page.on('response', waitingRoomPageInterceptor)
  page.on('frameattached', captchaInterceptor)

  return promise
}

export async function gotoTessituraEvent(page, eventUrl, log = console.log) {
  log('Loading event page...')
  const gotoResponse = await page.goto(eventUrl)

  if (gotoResponse.status() === 200) {
    log('No obstacles to resolve')
    return gotoResponse
  }
  log('Starting resolution')
  return await resolveEventPageLoadingObstacles(page, eventUrl, log)
}
