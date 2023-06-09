const fs = require('fs');
const WebSocket = require('ws');

const BINANCE_WEBSOCKET_URL = 'wss://stream.binance.com/stream';
const BINANCE_TICKERS_STREAM = '!ticker_1h@arr@3000ms';
const QUOTE_CURRENCY = 'USDT';
const MAX_NUMBER_OF_PAIRS = 10;
const wsBinanceClient = new WebSocket(BINANCE_WEBSOCKET_URL);

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
        changePercentage: ticker.P,
      };
    })
    .filter((ticker) => !ticker.symbol.split('/')[0].endsWith('UP'))
    .filter((ticker) => !ticker.symbol.split('/')[0].endsWith('DOWN'))
    .sort((a, b) => b.changePercentage - a.changePercentage)
    .slice(0, MAX_NUMBER_OF_PAIRS);

  tickers = filteredTickers.map((ticker) => ticker.symbol);
  saveTickers(tickers);

  console.log(new Date(), filteredTickers);
});

wsBinanceClient.on('open', () => {
  subscribeToBinanceTickers();
});

const saveTickers = (tickers) => {
  const tickerData = JSON.stringify(tickers, null, 2);
  fs.writeFileSync('ticker.json', tickerData, { encoding: 'utf8', flag: 'w' });
};
