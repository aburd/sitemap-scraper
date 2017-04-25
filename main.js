const Promise = require('bluebird')
const request = Promise.promisifyAll(require('request'))
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const url = require('url')

const siteUrl = 'http://www.servcorp.co.jp';
const siteMapUrl = siteUrl + '/en/site-map'

// Set up CSV
const writePath = path.resolve(__dirname, 'links-result.csv')
const writeStream = fs.createWriteStream(writePath)
writeStream.write('URL\tText\tNumber\n')

const lang = process.argv[2];

// Explanation to give if no language
process.on('exit', (code) => {
  if(code === 1) {
    console.log('Process failed with exit code:', code)
    console.log('Please enter a language code as the first argument to the script.')
    console.log('Possible arguments are \'ja\' or \'en\'')
  } else {
    console.log('Script was successful. Exiting with code:', code)
  }
})

// Exit the process before starting if no language is given
if(lang === undefined) {
  process.exit(1)
}

function getNumberOfH1Tags(pageUri) {
  const requestOptions = {
    uri: pageUri,
    timeout: 10000
  }
  return new Promise((resolve, reject) => {
    return request.get(requestOptions, (err, response, body) => {
      if(err) {
        reject(err)
      } else {
        const $ = cheerio.load(body)
        const $h1 = $('h1')
        const res = {
          url: url.resolve(siteUrl, pageUri),
          text: $h1.text(),
          number: $h1.length
        }

        console.log('Wrote information to:', res.url)

        resolve(res);
      }
    })
  })
}

request.getAsync(siteMapUrl)
  .then((response) => {
    const $ = cheerio.load(response.body)
    const urls = $('.site-map a').map((i, el) => {
      return url.resolve(siteUrl, $(el).attr('href'))
    }).get()

    // return Promise.mapSeries(urls, request.getAsync)
    return Promise.mapSeries(urls, getNumberOfH1Tags)
  })
  .then((responseObjects) => {
    const locationInformation = responseObjects.sort(responseObject => responseObject.number > 0).map(res => {
      return `${res.url}\t${res.text}\t${res.number}`
    }).join('\n')
    writeStream.write(locationInformation)

    console.log('Finished writing CSV at:', writePath)

    // Exit normally if successful
    process.exit(0);
  })
  .catch((err) => {
    console.log('Error running script: ', err)
  })
