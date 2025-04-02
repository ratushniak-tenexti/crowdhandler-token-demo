import puppeteer from 'puppeteer-extra'
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { getCrowhandlerToken } from './browser-flow.js';

puppeteer.use(RecaptchaPlugin({
  provider: { id: '2captcha', token: process.env.TWO_CAPTCHA_API_KEY },
  visualFeedback: true,
}))

const eventUrl = new URL('https://tickets.dso.org/syos/performance/9922')

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_CHROMIUM_PATH,
  headless: process.env.PUPPETEER_IS_HEADLESS === 'true',
  args: [`--proxy-server=${process.env.PROXY_URL}`],
})

const page = await browser.newPage()

await page.authenticate({
  username: process.env.PROXY_USERNAME,
  password: process.env.PROXY_PASSWORD
})

await page.goto(eventUrl.toString())

const token = await getCrowhandlerToken(page, eventUrl.hostname)
browser.close()

console.log('Token:', token)
