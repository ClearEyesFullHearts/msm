const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const URL = 'https://alpha.ysypya.com';

function crawl(base) {
    const paths = [];
    const dirs = [''];
    var i = 0;
    while (i < dirs.length) {
        const dir = dirs[i];
        const dirents = fs.readdirSync(`${base}${path.sep}${dir}`, { withFileTypes: true });
        dirents.forEach(function(dirent) {
            let fullPath = `${dir}${path.sep}${dirent.name}`;
            if (dirent.isDirectory()) {
                dirs.push(fullPath);
            } else {
                paths.push(fullPath);
            }
        });
        ++i;
    }
    return {
        dirs,
        paths
    };
}

function download(filename) {
    return new Promise((resolve) => {
        const file = fs.createWriteStream(`./download${filename}`);
        const request = https.get(`${URL}${filename}`, function(response) {
           response.pipe(file);
        
           // after download completed close filestream
           file.on("finish", () => {
               file.close();
               console.log(`Download Completed for ${filename}`);
               resolve();
           });
        });
    });
}


(async () => {

    const {
        dirs,
        paths
    } = crawl('./dist');

    dirs.forEach((dir) => {
        fs.mkdirSync(`./download${path.sep}${dir}`, { recursive: true })
    });
    for(let i = 0; i < paths.length; i++){
        await download(paths[i])
    }

    let distTxt = '';
    let downTxt = '';
    paths.forEach((p) => {
        distTxt += fs.readFileSync(`./dist${p}`);
        downTxt += fs.readFileSync(`./download${p}`);
    });

    const hashDist = crypto.createHash('sha256').update(distTxt).digest('hex');
    const hashDown = crypto.createHash('sha256').update(downTxt).digest('hex');

    if(hashDist === hashDown){
        console.log('VICTORY!');
    }else{
        console.log('FAILURE');
        console.log('DIST:', hashDist);
        console.log('DOWNLOAD:', hashDown);
    }
})()