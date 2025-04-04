import puppeteer from 'puppeteer-extra'
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { gotoTessituraEvent } from './puppeteer-utils.js';

puppeteer.use(RecaptchaPlugin({
  provider: { id: '2captcha', token: process.env.TWO_CAPTCHA_API_KEY },
  visualFeedback: true,
}))

function createTimeLogger(label) {
  const formattedLabel = `[${label}]`
  console.time(formattedLabel)

  return (...args) => console.timeLog(formattedLabel, ...args)
}

function getCookieFromResponse(cookieName, response) {
  const prefix = cookieName + '='

  const setCookieString = response.headers()['set-cookie']
  const startIndex = setCookieString.indexOf(prefix) + prefix.length
  const endIndex = setCookieString.indexOf(';', startIndex)

  return setCookieString.substring(startIndex, endIndex)
}

async function ptintCrowdhandlerTokenForEvent(browser, eventUrl) {
  const page = await browser.newPage()

  await page.authenticate({
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  })

  const hostname = eventUrl.hostname
  const log = createTimeLogger(hostname)

  try {
    const response = await gotoTessituraEvent(page, eventUrl, log)
    await page.close()
    const token = getCookieFromResponse('crowdhandler', response)
    log(`crowdhandler = ${token}`)
  } catch(err) {
    return console.error(`Error on ${hostname}:`, err)
  }
}

const EVENT_URLS = [
  'https://my.ensembleartsphilly.org/syos/performance/55159',
  'https://tickets.nycballet.com/syos/performance/8729',
  'https://tickets.drphillipscenter.org/syos/performance/19860',
  'https://tickets.dso.org/syos/performance/9922',
  'https://secure.bso.org/syos/performance/26264',
  'https://tickets.roundabouttheatre.org/syos/performance/38015',
  'https://my.nyphil.org/en/syos/performance/6221',
  'https://my.theford.com/en/syos2/performance/10012',
  'https://my.laphil.com/en/syos2/performance/9460',
  'https://my.hollywoodbowl.com/en/syos2/performance/10317'
]

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_CHROMIUM_PATH,
  headless: process.env.PUPPETEER_IS_HEADLESS === 'true',
  args: [`--proxy-server=${process.env.PROXY_URL}`],
})

await Promise.allSettled(EVENT_URLS.map(url =>
  ptintCrowdhandlerTokenForEvent(browser, new URL(url)))
)
await browser.close()
