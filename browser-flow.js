import puppeteer from "puppeteer-extra";
import RecaptchaPlugin from "puppeteer-extra-plugin-recaptcha";

puppeteer.use(RecaptchaPlugin({
  provider: { id: '2captcha', token: process.env.TWO_CAPTCHA_API_KEY },
  visualFeedback: true,
}))

async function waitForRedirection(page, hostname, timeout) {
  return await page.waitForResponse(res => {
    const url = new URL(res.url())
    return res.status() === 302 && url.hostname === hostname
  }, { timeout })
}

async function tryWaitingForCaptcha(page, maxReloads = 1) {
  try {
    const frame = await page.waitForFrame(f => f.name().startsWith('a-'));
    return !!await frame.waitForSelector('div.recaptcha-checkbox-border');
  } catch (err) {
    console.log(`Captcha not appearing. ${maxReloads} page reloads left`)

    if (maxReloads) {
      return await tryWaitingForCaptcha(page, maxReloads - 1)
    }
    return false
  }
}

async function getTokenFromCookies(browser) {
  return (await browser.cookies()).find(c => c.name === 'crowdhandler')?.value
}

async function getTokenFromResponse(response) {
  const cookie = response.headers()['set-cookie']

  if (!cookie || !cookie.includes('crowdhandler')) {
    throw new Error('No crowdhandler cookie in set response headers')
  }
  return cookie.substring(cookie.indexOf('=') + 1, cookie.indexOf(';'))
}

export async function getCrowhandlerToken(eventContext, puppeteerOptions) {
  const browser = await puppeteer.launch(puppeteerOptions)
  const page = await browser.newPage()

  await page.goto(eventUrl.toString())

  const hostname = eventContext.url.hostname

  try {
    await waitForRedirection(page, hostname, 10000)
  } catch(err) {
    console.log('Skipped the waiting room. Taking token from browser cookies...')
    const token = await getTokenFromCookies(browser)

    await browser.close()
    return token
  }
  console.log('Redirected to waiting room')

  const captchaExists = await tryWaitingForCaptcha(page)
  if (!captchaExists) {
    throw new Error('Failed to await captcha')
  }

  console.log('Solving captcha...')
  await page.solveRecaptchas()
  console.log('Captcha solved!')

  const response = await waitForRedirection(page, hostname, 30000)
  const token = await getTokenFromResponse(response)
  await browser.close()
  return token
}
