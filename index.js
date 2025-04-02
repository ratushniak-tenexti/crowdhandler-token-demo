import { getCrowhandlerToken } from './browser-flow.js';

const eventContext = {
  url: new URL('https://tickets.dso.org/syos/performance/9922')
}

const puppeteerOptions = {
  executablePath: process.env.PUPPETEER_CHROMIUM_PATH,
  headless: process.env.PUPPETEER_IS_HEADLESS === 'true',
}

const token = await getCrowhandlerToken(eventContext, puppeteerOptions)
console.log('Token:', token)
