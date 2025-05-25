# Rules

このリポジトリでは、以下のルールに従って開発を進めてください。

## Communication

- Use Japanese.

## 期待する回答

- セキュリティのベストプラクティスに従った実装
- 日本語での詳細な説明

## Coding Rules

### JavaScript / TypeScript

- `const` / `let` を優先使用し、`var` は使用しない
- ログ出力には `console.log` を極力使用しない（デバッグ時を除く）
- lintはprettierに沿う
- make lint/fixによってlintを行う
- Effect-tsを利用する

### Projects

- `src`: Codes

### Format

- LintとFormatはPR前に必ず実行してください
  - make lint/fix によって実行できます

## Testing

- make testによってテストが出来ます

## Ohters

- 可読性と保守性を重視
- コードの重複を避け、再利用性を意識
- 適切なエラーハンドリングと例外処理

### GitHub Token

- 既に環境変数にGITHUB_TOKENがあるので上書きしないでください。
- 特別な理由がある場合は、事前に確認・相談してください。
