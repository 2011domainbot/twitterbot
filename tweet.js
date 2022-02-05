const axios = require('axios');
const twit = require('twit');

const twitterConfig = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
};

const twitterClient = new twit(twitterConfig);

// Tweet a text-based status
async function tweet(tweetText) {
  const tweet = {
     status: tweetText,
  };

  twitterClient.post('statuses/update', tweet, (error, tweet, response) => {
    if (!error) {
        console.log(`Successfully tweeted: ${tweetText}`);
    } else {
        console.error(error);
    }
  });
}

// Format a provided URL into it's base64 representation
function getBase64(url) {
   return axios.get(url, { responseType: 'arraybuffer'}).then(response => Buffer.from(response.data, 'binary').toString('base64'))
}

module.exports = { tweet: tweet };
