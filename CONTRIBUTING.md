# Contributing

Contributions are welcome! Please follow these guidelines.

## Getting Started

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/arbitrum-gmx-agent-skill.git
   cd arbitrum-gmx-agent-skill
   ```
3. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-new-feature
   ```
4. **Install dependencies:**
   ```bash
   npm install
   ```

## Development Workflow

### Local Testing

```bash
# Run full test suite
npm test

# Run dev server with auto-reload
npm run dev

# Test specific functionality
node -e "require('./lib/prices').getPrice('ETH/USD').then(console.log)"
```

### Code Style

- Use **ES6+** syntax
- Follow **async/await** pattern (not promises)
- Add JSDoc comments for public functions
- Keep functions <100 lines (refactor if needed)

Example:

```javascript
/**
 * Get current ETH price from Chainlink
 * @returns {Promise<number>} Price in USD
 */
async function getETHPrice() {
  const price = await getPrice('ETH/USD')
  return price.price
}
```

### Adding New Markets

1. **Update `lib/constants.js`:**
   ```javascript
   MARKETS: {
     'NEW_MARKET/USD': '0x...,
     // ... existing markets
   }
   ```

2. **Add Chainlink feed:**
   ```javascript
   PRICE_FEEDS: {
     'NEW_MARKET/USD': '0x...',
     // ... existing feeds
   }
   ```

3. **Test it:**
   ```bash
   npm test
   ```

### Adding New Skills

1. Create `skills/my-skill/index.js`
2. Export functions matching the skill interface
3. Add to `index.js` exports
4. Add tests to `test/run.js`

Example skill:

```javascript
// skills/my-skill/index.js
async function myFunction(params) {
  // Implementation
  return result
}

module.exports = { myFunction }
```

### Fixing Bugs

1. **Create an issue first** (describe the problem)
2. **Write a test** that fails with the current code
3. **Fix the bug**
4. **Verify the test passes**
5. **Submit a PR**

## Submitting Changes

### Before Submitting

- ✅ Run `npm test` — all tests pass
- ✅ No console.errors or warnings
- ✅ Add JSDoc comments to new functions
- ✅ Update README if behavior changes

### Commit Message Format

```
<type>: <subject>

<body (optional)>

Fixes #<issue-number>
```

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code restructuring
- `test:` Test additions/fixes
- `perf:` Performance improvements

Example:
```
feat: Add SOL/USD price feed monitoring

Adds real-time monitoring for SOL market movements
Integrates with existing Chainlink feed infrastructure

Fixes #42
```

### Pull Request Process

1. **Create a PR** with a clear title and description
2. **Link related issues** (e.g., "Fixes #42")
3. **Describe changes** (what, why)
4. **Include test results**

PR template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] npm test passes
- [ ] Manual testing completed
- [ ] No new warnings

## Checklist
- [ ] Code follows style guide
- [ ] Comments added for complex logic
- [ ] README updated if needed
- [ ] No sensitive data in commits
```

## Architecture Guidelines

### File Organization

```
lib/         → Core logic (read/write)
skills/      → Feature modules (market-reader, position-manager, etc.)
agent/       → HTTP server/public API
scripts/     → CLI tools
test/        → Test suite
```

### Module Exports

Keep exports clean:

```javascript
// ✅ Good
module.exports = { publicFunction1, publicFunction2 }

// ❌ Avoid
module.exports = { _internal, publicFunction1 }
```

### Error Handling

Use descriptive error messages:

```javascript
// ✅ Good
if (!address || !ethers.isAddress(address)) {
  throw new Error(`Invalid Arbitrum address: ${address}`)
}

// ❌ Avoid
if (!address) {
  throw new Error('Bad input')
}
```

### Constants

Define all magic numbers as named constants:

```javascript
// ✅ Good
const MAX_LEVERAGE = 50
const SETTLEMENT_DELAY_MS = 30000
const GMX_V2_PRECISION = 30

// ❌ Avoid
if (leverage > 50) { ... }
await sleep(30000)
ethers.parseUnits(price, 30)
```

## Adding Documentation

### Update README

If your change:
- Adds a new endpoint → Update API table
- Changes setup process → Update Quick Start
- Adds a new concept → Add to Architecture section

### Update SKILL.md

If your change affects agent capabilities:
```markdown
## Supported Operations

| Category | Operation | Method | Description |
|----------|-----------|--------|-------------|
| **Your Skill** | your_function | READ/WRITE | What it does |
```

### Code Comments

Add JSDoc for all public functions:

```javascript
/**
 * Open a long position on GMX
 * @param {string} market - Market address
 * @param {number} leverage - Leverage (1-50x)
 * @returns {Promise<Object>} Transaction result
 * @throws {Error} If market invalid or leverage out of range
 */
async function goLong(market, leverage) {
  // Implementation
}
```

## Testing Requirements

All PRs must:

1. **Pass existing tests:**
   ```bash
   npm test
   ```

2. **Add tests for new functionality:**
   ```javascript
   // test/run.js
   if (await test('My new feature', async () => {
     const result = await myNewFunction()
     if (!result) throw new Error('Expected result')
     return result
   })) passed++; else failed++;
   ```

3. **Test against live Arbitrum One** (not simulation)

## Code Review Process

Reviewers will check:

- ✅ Tests pass
- ✅ Code style consistent
- ✅ No security issues
- ✅ Documentation updated
- ✅ Backwards compatible (unless breaking change)
- ✅ Performance acceptable

## Release Process

Releases follow [Semantic Versioning](https://semver.org):

- **MAJOR** - Breaking changes (e.g., API redesign)
- **MINOR** - New features (backwards compatible)
- **PATCH** - Bug fixes

To release (maintainers only):

```bash
npm version major|minor|patch
git push --tags
```

This auto-updates `package.json` and creates GitHub release.

## Community

- **Issues:** GitHub Issues tab
- **Discussions:** GitHub Discussions
- **Twitter:** Tag @arbitrum or @gmx_io

## Code of Conduct

Be respectful:
- Use welcoming language
- Accept constructive criticism
- Focus on code, not person
- No harassment or discrimination

## Questions?

- Check [README.md](./README.md)
- Review existing [GitHub Issues](../../issues)
- Post in [GitHub Discussions](../../discussions)

---

**Thank you for contributing! 🙏**
