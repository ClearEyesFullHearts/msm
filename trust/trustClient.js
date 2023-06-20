const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// url of the public facing website
const URL = 'https://alpha.ysypya.com';

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
    https.get(`${URL}${filename}`, (response) => {
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

  // compute hash for the whole thing
  let distTxt = '';
  let downTxt = '';
  paths.forEach((p) => {
    distTxt = fs.readFileSync(`./dist${p}`).toString('base64');
    downTxt = fs.readFileSync(`./download${p}`).toString('base64');

    if (distTxt === downTxt) {
      console.log(`You can trust ${p}`);
    } else {
      console.log(`No trust for ${p}`);
    }
  });
})();
