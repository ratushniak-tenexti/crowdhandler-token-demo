import puppeteer from 'puppeteer-extra'
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { getCrowhandlerToken } from './browser-flow.js';

const puppeteerOptions = {
  executablePath: process.env.PUPPETEER_CHROMIUM_PATH,
  headless: process.env.PUPPETEER_IS_HEADLESS === 'true',
}

puppeteer.use(RecaptchaPlugin({
  provider: { id: '2captcha', token: process.env.TWO_CAPTCHA_API_KEY },
  visualFeedback: true,
}))

const eventUrl = new URL('https://tickets.dso.org/syos/performance/9922')
const token = await getCrowhandlerToken(eventUrl, puppeteerOptions)
console.log('Token:', token)
