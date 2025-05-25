PNPM=pnpm
NPX=npx
NODE=node

install:
	$(PNPM) install

tsc:
	$(NPX) tsc 

run: tsc
	$(NODE) dist/main.js

lint: lint/prettier

lint/fix: lint/prettier/fix

lint/prettier:
	$(NPX) prettier --check 'src/**/*.{ts,tsx,json,css}'

lint/prettier/fix:
	$(NPX) prettier --write 'src/**/*.{ts,tsx,json,css}'
