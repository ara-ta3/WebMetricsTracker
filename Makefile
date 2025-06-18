PNPM=pnpm
NODE=node
ACT=act

install:
	$(PNPM) install

setup:
	cp -f ./config/websites.sample.yaml ./config/websites.yaml

tsc:
	$(PNPM) exec tsc

run: tsc
	$(NODE) dist/main.js

test/watch:
	$(PNPM) test

test:
	$(PNPM) test --run

lint: lint/prettier

lint/fix: lint/prettier/fix

lint/prettier:
	$(PNPM) exec prettier --check 'src/**/*.{ts,tsx,json,css}'

lint/prettier/fix:
	$(PNPM) exec prettier --write 'src/**/*.{ts,tsx,json,css}'

act/ci:
	$(ACT) ci

act/schedule:
	$(ACT) schedule
