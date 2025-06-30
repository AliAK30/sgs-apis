const {Readable} = require("stream")
const csv = require("csv-parser")
const sharp = require('sharp');

exports.formatName = (name) => {
  return name
    .trim()
    .split(/\s+/) // split by one or more spaces
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

exports.getAgeInYears = (dob) => {
  const birthDate = dob;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

exports.parseCSVFromText = text => {
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

exports.compressImage = async buffer => {
  const options = {
    width: 256,       // Max width in pixels
    height: 256,      // Max height in pixels
  };

  return sharp(buffer)
    .resize(options.width, options.height, {
      fit: 'inside',
      withoutEnlargement: true
    }).toBuffer();
}

// Helper function to emit real-time events
exports.emitToUser = (io, userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

// Helper function to get user's socket room
exports.getUserRoom = (userId) => `user_${userId}`;