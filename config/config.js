const crypto = require('crypto');


function generateRandomString(length) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

const sessionSecret="mysitesessionsecret";



module.exports={
    sessionSecret,
    generateRandomString
}