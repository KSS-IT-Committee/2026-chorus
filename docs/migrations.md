# chorus データベースのマイグレーション

`drizzle/` は専用の `chorus` データベース用です。共有 `appdata` 用の `2026-db` migrator は使わないでください。アプリのデプロイ時には、このマイグレーションは自動実行されません。

## 適用前の確認

VPS に Ansible の `chorus` DB 設定が適用済みであることを確認します。既存データがある場合はバックアップを取り、適用済みのマイグレーションと内容を確認してください。特に `0004_sync_student_part.sql` は `part` 列のない `students` にデータがあると失敗します。

スキーマ変更がある場合は、稼働中のアプリと互換性があることを確認してから、アプリの更新より先に適用します。`main` へのマージ後は Ansible がアプリを自動更新するため、順序に注意してください。

## VPS での実行

GitHub Actions が作成した `ghcr.io/kss-it-committee/2026-chorus/migrator` イメージを使います。初回は GHCR のパッケージを公開するか、VPS に読み取り権限を設定してください。以下の `sha-XXXXXXX` は適用したいコミットの短縮 SHA に置き換えます。PR の未マージ変更を適用する場合は、その PR のイメージと適用先を確認してください。

```sh
sudo docker pull ghcr.io/kss-it-committee/2026-chorus/migrator:sha-XXXXXXX
sudo sh -c '
  . /var/lib/server/state/postgres.env
  export DATABASE_URL="$CHORUS_DATABASE_URL"
  docker run --rm --network web -e DATABASE_URL \
    ghcr.io/kss-it-committee/2026-chorus/migrator:sha-XXXXXXX
'
```

実行後は、DB の `drizzle.__drizzle_migrations` と必要なテーブル・カラムを確認します。エラー時はアプリの更新を進めず、原因を調べてください。接続先の DB が空であっても、アプリのヘルスチェックだけではスキーマの適用状況は確認できません。

初期管理者の作成方法は [auth.md](auth.md) を参照してください。

PR プレビューは本番 DB のスキーマを複製しますが、PR 独自のマイグレーションは自動適用されません。検証する場合はプレビュー用 DB を対象に実行し、本番用 URL を使わないでください。
