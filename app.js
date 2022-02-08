const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');
const { ethers } = require('ethers');
const tweet = require('./tweet');
const cache = require('./cache');

// Format tweet text
function formatAndSendTweet(event) {
  // Handle both individual items + bundle sales
  const assetName = _.get(event, ['asset', 'name'], _.get(event, ['asset_bundle', 'name']));
  const openseaLink = _.get(event, ['asset', 'permalink'], _.get(event, ['asset_bundle', 'permalink']));

  const totalPrice = _.get(event, 'total_price');

  const tokenDecimals = _.get(event, ['payment_token', 'decimals']);
  const tokenUsdPrice = _.get(event, ['payment_token', 'usd_price']);
  const tokenEthPrice = _.get(event, ['payment_token', 'eth_price']);

  const formattedUnits = ethers.utils.formatUnits(totalPrice, tokenDecimals);
  const formattedEthPrice = formattedUnits * tokenEthPrice;
  const formattedUsdPrice = formattedUnits * tokenUsdPrice;

  const tweetText = `${assetName} bought for ${formattedEthPrice}${ethers.constants.EtherSymbol} ($${Number(formattedUsdPrice).toFixed(2)}) #2011 #Namecoin ${openseaLink}`;

  console.log(tweetText);

  return tweet.tweet(tweetText);
}

const isNamecoin2011 = (data) => {
  const traits = _.get(data, ['traits'])

  const year = traits.find(obj => { return obj.trait_type === 'Year' })?.value === '2011';
  const nmc = traits.find(obj => { return obj.trait_type === 'NMC' })?.value === 'Namecoin';

  return (year && nmc) ? true : false;
}

const eventsQuery = async(lastSaleTime) => {
  return await axios.get('https://api.opensea.io/api/v1/events', {
    headers: {
      'X-API-KEY': process.env.X_API_KEY
    },
    params: {
      collection_slug: process.env.OPENSEA_COLLECTION_SLUG,
      event_type: 'successful',
      occurred_after: lastSaleTime,
      only_opensea: 'false'
    }
  });
};

const assetQuery = async(tokenId, address) => {
  return await axios.get(`https://api.opensea.io/api/v1/asset/${address}/${tokenId}`, {
    headers: {
      'X-API-KEY': process.env.X_API_KEY
    },
  });
};

// Poll OpenSea every 5 minutes & retrieve all sales for a given collection in either the time since the last sale OR in the last minute
setInterval(() => {
  const lastSaleTime = cache.get('lastSaleTime', null) || moment().startOf('minute').subtract(300, "seconds").unix();

  console.log(`Last sale (in seconds since Unix epoch): ${cache.get('lastSaleTime', null)}`);

  eventsQuery(lastSaleTime).then((response) => {
    const events = _.get(response, ['data', 'asset_events']);

    const sortedEvents = _.sortBy(events, function(event) {
      const created = _.get(event, 'created_date');

      return new Date(created);
    })

    console.log(`${events.length} sales since the last one...`);

    _.each(sortedEvents, (event) => {
      const tokenId = _.get(event, ['asset', 'token_id']);
      const address = _.get(event, ['asset', 'asset_contract', 'address']);

      assetQuery(tokenId, address).then((resp) => {
        if (isNamecoin2011(_.get(resp, ['data']))) {
          const created = _.get(event, 'created_date');
          cache.set('lastSaleTime', moment(created).unix());

          return formatAndSendTweet(event);
        }
      }).catch((error) => {
        console.error(error);
      });
    });
  }).catch((error) => {
    console.error(error);
  });
}, 300000);
