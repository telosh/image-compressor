# 画像圧縮ツール

これは、Go (WebAssembly) を利用してブラウザ上で画像を圧縮するNext.jsアプリケーションです。

## ✨ 機能

このアプリケーションは、以下の画像処理をブラウザ上で高速に実行します。

*   **フォーマット変換**: JPEGとPNG形式の相互変換に対応しています。
*   **リサイズ**: 画像の幅と高さを指定してリサイズできます。アスペクト比を維持したままの変更も可能です。
*   **グレースケール化**: 画像を白黒のグレースケールに変換します。
*   **JPEG品質調整**: JPEG形式で保存する際の圧縮品質をスライダーで直感的に調整できます。

## 🚀 はじめに

### 前提条件

*   Node.js (v18以降)
*   Go

### セットアップと実行

1.  **リポジトリをクローン:**
    ```bash
    git clone <repository-url>
    cd image-compressor
    ```

2.  **依存関係をインストール:**
    ```bash
    npm install
    ```

3.  **Go WebAssemblyモジュールをビルド:**
    Goのソースコード（`go/main.go`）をWebAssemblyモジュールにコンパイルし、Next.jsアプリケーションが利用できるように `public` ディレクトリに出力します。

    ```bash
    cd go
    GOOS=js GOARCH=wasm go build -o ../public/main.wasm .
    cd ..
    ```

4.  **`wasm_exec.js`をコピー:**
    Go Wasmファイルを実行するために必要なJavaScriptファイルを `public` ディレクトリにコピーします。このファイルはGoのインストールに含まれています。

    ```bash
    cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" public/
    ```
    > **Note:** Goのバージョンによってはパスが `lib/wasm/wasm_exec.js` になる場合があります。

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くと、結果が表示されます。


## ⚙️ 処理フロー

本アプリケーションは、Next.jsのフロントエンドとGoで書かれたWebAssembly(Wasm)モジュールが連携して動作します。ユーザーの操作から画像が処理されるまでの流れは以下の通りです。

1.  **ユーザー操作**: ユーザーがブラウザで画像ファイルを選択し、リサイズやフォーマット変換などの処理オプションを設定します。
2.  **データ連携**: 「画像処理を実行」ボタンがクリックされると、Next.js(React)アプリケーションは画像データを `Uint8Array` 形式に変換し、設定オプションと共にJavaScriptの関数を呼び出します。
3.  **Wasm実行**: このJavaScript関数は、GoでコンパイルされたWasmモジュール内の `processImage` 関数に処理を委譲します。
4.  **Goによる画像処理**:
    *   受け取った画像データをGoの `image` パッケージでデコードします。
    *   `nfnt/resize` ライブラリを使用して、指定されたサイズへのリサイズ処理を行います。
    *   必要に応じてグレースケール変換を適用します。
    *   `image/jpeg` または `image/png` パッケージを使い、指定されたフォーマットと品質で画像をエンコードします。
5.  **結果の返却**: 処理後の画像データ（バイト配列）がWasmモジュールからJavaScriptへ返されます。
6.  **画面表示**: フロントエンドは受け取ったデータを元に `Blob` を生成し、処理後の画像を画面に表示します。ファイルサイズの変化も確認できます。

このアーキテクチャにより、サーバーサイドに画像をアップロードすることなく、全ての処理をクライアントのブラウザ内で完結させています。

## 🛠️ 技術スタック

*   Next.js
*   TypeScript
*   Go (WebAssembly)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

memo 
```cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .```

### ✨ 機能

このアプリケーションは、以下の画像処理をブラウザ上で高速に実行します。

*   **フォーマット変換**: JPEGとPNG形式の相互変換に対応しています。
*   **リサイズ**: 画像の幅と高さを指定してリサイズできます。アスペクト比を維持したままの変更も可能です。
*   **グレースケール化**: 画像を白黒のグレースケールに変換します。
*   **JPEG品質調整**: JPEG形式で保存する際の圧縮品質をスライダーで直感的に調整できます。

### ⚙️ 処理フロー

本アプリケーションは、Next.jsのフロントエンドとGoで書かれたWebAssembly(Wasm)モジュールが連携して動作します。ユーザーの操作から画像が処理されるまでの流れは以下の通りです。

1.  **ユーザー操作**: ユーザーがブラウザで画像ファイルを選択し、リサイズやフォーマット変換などの処理オプションを設定します。
2.  **データ連携**: 「画像処理を実行」ボタンがクリックされると、Next.js(React)アプリケーションは画像データを `Uint8Array` 形式に変換し、設定オプションと共にJavaScriptの関数を呼び出します。
3.  **Wasm実行**: このJavaScript関数は、GoでコンパイルされたWasmモジュール内の `processImage` 関数に処理を委譲します。
4.  **Goによる画像処理**:
    *   受け取った画像データをGoの `image` パッケージでデコードします。
    *   `nfnt/resize` ライブラリを使用して、指定されたサイズへのリサイズ処理を行います。
    *   必要に応じてグレースケール変換を適用します。
    *   `image/jpeg` または `image/png` パッケージを使い、指定されたフォーマットと品質で画像をエンコードします。
5.  **結果の返却**: 処理後の画像データ（バイト配列）がWasmモジュールからJavaScriptへ返されます。
6.  **画面表示**: フロントエンドは受け取ったデータを元に `Blob` を生成し、処理後の画像を画面に表示します。ファイルサイズの変化も確認できます。

このアーキテクチャにより、サーバーサイドに画像をアップロードすることなく、全ての処理をクライアントのブラウザ内で完結させています。
