const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const url = require('url');

// url of the public facing website
const API_URL = 'http://api.ysypya.com';
const BASE_URL = 'http://localhost:3000';

const PROD_URL = 'https://beta.ysypya.com';
// const PROD_URL = 'http://localhost:3000';

function crawl(base) {
  const paths = [];
  const dirs = [''];
  let i = 0;
  while (i < dirs.length) {
    const dir = dirs[i];
    const dirents = fs.readdirSync(`${base}${path.sep}${dir}`, { withFileTypes: true });
    dirents.forEach((dirent) => {
      const fullPath = `${dir}${path.sep}${dirent.name}`;
      if (dirent.isDirectory()) {
        dirs.push(fullPath);
      } else {
        paths.push(fullPath);
      }
    });
    i += 1;
  }
  return {
    dirs,
    paths,
  };
}

function download(filename) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(`./download${filename}`);
    // 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    // 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    http.get(`${BASE_URL}${filename}`, (response) => {
      response.pipe(file);

      // after download completed close filestream
      file.on('finish', () => {
        file.close();
        console.log(`Download Completed for ${filename}`);
        resolve();
      });
    });
  });
}

(async () => {
  // get all the files from the distribution
  const {
    dirs,
    paths,
  } = crawl('./dist');

  // create the folders for the writestream
  dirs.forEach((dir) => {
    fs.mkdirSync(`./download${path.sep}${dir}`, { recursive: true });
  });

  // download all the files from the url
  for (let i = 0; i < paths.length; i += 1) {
    // dwonload never fails b/c a 404 error send the index.html file instead
    await download(paths[i]);
  }

  // compare the files
  let downTxt = '';
  const map = {
    COMMIT: process.env.BUILD_HASH,
    API_URL,
    BASE_URL: `${PROD_URL}/`,
  };
  paths.forEach((p) => {
    downTxt = fs.readFileSync(`./dist${p}`).toString('base64');
    const hash = crypto.createHash('sha256');
    hash.update(downTxt);
    const digest = hash.digest();

    if (p !== `${path.sep}index.html`) {
      map[url.format(`${PROD_URL}${p}`)] = digest.toString('base64');
    } else {
      map[`${PROD_URL}/`] = digest.toString('base64');
    }
  });

  fs.writeFileSync('./extension/config.js', `export default ${JSON.stringify(map, null, 2)};\n`);
  const content = fs.readFileSync('./extension/scripts/content.js').toString();
  const lines = content.split('\n');
  lines[0] = `const COMMIT = '${process.env.BUILD_HASH}';`;
  fs.writeFileSync('./extension/scripts/content.js', lines.join('\n'));
  fs.rmdirSync('./download', { recursive: true, force: true });
})();
