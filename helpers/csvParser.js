const {Readable} = require("stream")
const csv = require("csv-parser")

const parseCSVFromText = text => {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = Readable.from(text); // Convert text to stream
  
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
}

module.exports = parseCSVFromText