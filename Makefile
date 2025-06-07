PNPM=pnpm
NODE=node

install:
	$(PNPM) install

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
