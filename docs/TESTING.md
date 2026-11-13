# Testing Guide

## Running Tests

```bash
# Unit tests
npm test

# E2E tests  
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Test Structure

```
tests/
  unit/
    auth.test.js
    socket.test.js
  integration/
    api.test.js
  e2e/
    voice.test.js
```

## Writing Tests

### Unit Test Example

```js
describe('JWT Auth', () => {
  it('should return 401 for missing token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
```
