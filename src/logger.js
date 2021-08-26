const timestamp = () => {};
timestamp.toString = () => `[DEBUG ${new Date().toString()}]`;

export default {
  // eslint-disable-next-line no-console
  log: console.log.bind(console, '%s', timestamp),
};
