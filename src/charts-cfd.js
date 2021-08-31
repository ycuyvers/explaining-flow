const Chart = require('chart.js');
const PubSub = require("pubsub-js");

function colorFor(name, border) {
  switch(name) {
    case 'Backlog':
      return `rgba(128, 128, 128, ${border ? 0.25 : 0.1})`;
    case 'Done':
      return `rgba(180, 255, 150, ${border ? 1 : 0.25})`;
    case '-':
      return `rgba(255, 99, 132, ${border ? 1 : 0.1})`;
    default:
      return `rgba(255, 206, 86, ${border ? 1 : 0.1})`;
  }
}

function createChart(ctx, speed, columns) {
  const startTime = new Date();
  const labels = []
  const data = columns.reduce((map, c) => {
    map[c.id] = []
    return map
  }, {});

  const chartData = {
    labels,
    datasets: columns.slice().reverse().map((c, i) => ({
      label: c.name,
      lineTension: 0,
      data: data[c.id],
      borderColor: colorFor(c.name, true),
      backgroundColor: colorFor(c.name, false),
      fill: i === 0 ? true : '-1',
      borderWidth: 1,
      pointRadius: 0,
    }))
  };

  const chart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      animation: false,
      scales: {
        x: {
          type: 'linear',
          ticks: {stepSize: 5 * speed}
        },
        y: {
          type: 'linear',
          position: 'left',
          stacked: true,
          ticks: {stepSize: 1}
        },
      }
    }
  });
  return {chart, labels, data, startTime};
}

function xValue(startTime, speed) {
  const currentTime = new Date();
  return (currentTime - startTime) * speed / 1000;
}

function CfdChart($chart, updateInterval, speed) {
  const ctx = $chart.getContext('2d');

  var chart = undefined;
  PubSub.subscribe('board.ready', (topic, {columns}) => {
    const state = createChart(ctx, speed, columns);
    chart = state.chart

    const timerId = setInterval(() => state.chart.update(), updateInterval);

    const update = () => {
      state.labels.push(xValue(state.startTime, speed));
      columns.forEach(c => {
        state.data[c.id].push(c.size());
      });
    };
    const updateTimer = setInterval(update, 50)

    PubSub.subscribe('board.done', () => {
      clearInterval(timerId);
      clearInterval(updateTimer);
      state.chart.update()
    });
  });

  return {
    destroy: () => {
      if (chart) chart.destroy();
    }
  };
}

module.exports = CfdChart