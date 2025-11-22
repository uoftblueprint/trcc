const config = {
  "*.{ts,tsx,mts}": ["prettier --write", "eslint --fix"],
  "*.{json,md,yml,yaml}": ["prettier --write"],
};

export default config;
