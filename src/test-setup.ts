// Mock global objects for testing
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
  },
  writable: true,
});

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  error: () => {},
};