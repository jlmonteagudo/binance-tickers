const express = require('express');
const WebSocket = require('ws');
const app = express();
const port = 3000;

const BINANCE_WEBSOCKET_URL = 'wss://stream.binance.com/stream';
const BINANCE_TICKERS_STREAM = '!ticker_1h@arr@3000ms';
const QUOTE_CURRENCY = 'USDT';
const MAX_NUMBER_OF_PAIRS = 10;
const MIN_NUMBER_OF_TRADES_PER_HOUR = 1000;
const MIN_CHANGE_PERCENTAGE = 1;

const wsBinanceClient = new WebSocket(BINANCE_WEBSOCKET_URL);

let tickers = [];

const exchangeSymbolToStandard = (exchangeSymbol) => {
  const index = exchangeSymbol.indexOf(QUOTE_CURRENCY);
  return exchangeSymbol.slice(0, index) + '/' + exchangeSymbol.slice(index);
};

const getNewSubscriptionId = () => {
  return Math.floor(Math.random() * 1000000);
};

const subscribeToBinanceTickers = () => {
  const message = {
    id: getNewSubscriptionId(),
    method: 'SUBSCRIBE',
    params: [BINANCE_TICKERS_STREAM],
  };

  wsBinanceClient.send(JSON.stringify(message));
};

wsBinanceClient.on('message', (message) => {
  const data = JSON.parse(message)['data'] || [];
  const filteredTickers = data
    .filter((ticker) => {
      const symbol = ticker.s;
      return symbol.endsWith(QUOTE_CURRENCY);
    })
    .map((ticker) => {
      const symbol = exchangeSymbolToStandard(ticker.s);
      return {
        symbol,
        changePercentage: +ticker.P,
        trades: ticker.n,
      };
    })
    .filter((ticker) => !ticker.symbol.split('/')[0].endsWith('UP'))
    .filter((ticker) => !ticker.symbol.split('/')[0].endsWith('DOWN'))
    .filter((ticker) => ticker.trades > MIN_NUMBER_OF_TRADES_PER_HOUR)
    .filter((ticker) => ticker.changePercentage > MIN_CHANGE_PERCENTAGE)
    .sort((a, b) => b.changePercentage - a.changePercentage)
    .slice(0, MAX_NUMBER_OF_PAIRS);

  tickers = filteredTickers.map((ticker) => ticker.symbol);
  console.log(new Date(), filteredTickers);
});

wsBinanceClient.on('open', () => {
  subscribeToBinanceTickers();
});

app.get('/tickers', (req, res) => {
  const response = {
    pairs: tickers,
  };

  res.send(response);
});

app.listen(port, () => {
  console.log(`Freqtrade Binance Tickers listening on ${port}`);
});
