# プロジェクト設計図

## 概要

このプロジェクトは、Go言語で記述されたWebAssembly（WASM）モジュールを利用して、ブラウザ上で高速な画像処理（圧縮、リサイズ、カラースケール変更）を行うWebアプリケーションです。

## 技術スタック

-   **フロントエンド:** Next.js, TypeScript, Tailwind CSS
-   **画像処理:** Go, WebAssembly
-   **開発・実行環境:** Docker

## システムアーキテクチャ

以下にシステムの構成図を示します。

```mermaid
graph TD
    subgraph "ユーザー"
        A[ブラウザ]
    end

    subgraph "フロントエンド (Next.js)"
        B[UIコンポーネント] -- ファイル/設定を渡す --> C{WASM連携ロジック}
        C -- 画像データ/設定 --> D[Go/WASMモジュール]
        D -- 処理結果 --> C
        C -- 処理後画像を表示/ダウンロード --> B
    end

    subgraph "Go/WASM バックエンド"
        E[Go 画像処理関数]
        E --> F[圧縮]
        E --> G[リサイズ]
        E --> H[カラースケール変換]
        subgraph "並列処理"
            direction LR
            I[Goroutine 1]
            J[Goroutine 2]
            K[...]
        end
        F & G & H --> I & J & K
    end

    A --> B

```

## 開発環境

Go言語によるWASM開発とNext.jsによるフロントエンド開発をスムーズに行うため、Dockerを利用して環境を構築します。

-   **Node.jsコンテナ:** Next.jsアプリケーションの実行環境
-   **Goコンテナ:** GoのソースコードをWASMにコンパイルするための環境

これにより、開発者ごとの環境差異をなくし、セットアップを容易にします。 