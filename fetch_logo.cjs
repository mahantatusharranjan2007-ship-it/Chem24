const https = require('https');

https.get('https://dduniversity.ac.in/', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;
    while ((match = imgRegex.exec(data)) !== null) {
      if (match[1].toLowerCase().includes('logo')) {
        console.log(match[1]);
      }
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
