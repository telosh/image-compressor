package main

import (
	"bytes"
	"fmt"
	"image"
	"image/draw"
	"image/jpeg"
	"image/png"

	// サポートする画像形式を増やす場合は、以下のようにアンダースコアでインポートします
	_ "image/png"
	"syscall/js"

	"github.com/nfnt/resize"
)

// add は2つの数値を加算して返すGoの関数です。
func add(this js.Value, i []js.Value) interface{} {
	if len(i) < 2 {
		return "Error: 2 arguments are required"
	}
	val1 := i[0].Int()
	val2 := i[1].Int()
	return val1 + val2
}

// processImage は、画像データと処理設定を受け取り、変換後の画像データを返します。
func processImage(this js.Value, i []js.Value) interface{} {
	if len(i) < 2 {
		return js.ValueOf("Error: Image data and options are required")
	}
	imageData := i[0]
	options := i[1]

	// --- オプションを取得 ---
	outputFormat := options.Get("format").String()
	quality := options.Get("quality").Int()
	width := uint(options.Get("width").Int())
	height := uint(options.Get("height").Int())
	grayscale := options.Get("grayscale").Bool()
	cropOpts := options.Get("crop")

	// --- 画像データをGoのスライスにコピー ---
	srcData := make([]byte, imageData.Get("length").Int())
	js.CopyBytesToGo(srcData, imageData)

	// --- デコード ---
	img, _, err := image.Decode(bytes.NewReader(srcData))
	if err != nil {
		return js.ValueOf("Error decoding image: " + err.Error())
	}

	// --- 切り抜き処理 ---
	if !cropOpts.IsUndefined() && !cropOpts.IsNull() {
		x := cropOpts.Get("x").Int()
		y := cropOpts.Get("y").Int()
		cropWidth := cropOpts.Get("width").Int()
		cropHeight := cropOpts.Get("height").Int()

		if cropWidth > 0 && cropHeight > 0 {
			// 切り抜き範囲を定義
			cropRect := image.Rect(x, y, x+cropWidth, y+cropHeight)
			// 元画像の範囲と切り抜き範囲の共通部分を取得
			intersectRect := cropRect.Intersect(img.Bounds())

			// 新しいRGBA画像を生成
			croppedImg := image.NewRGBA(intersectRect)
			// 元画像から切り抜き範囲を描画
			draw.Draw(croppedImg, croppedImg.Bounds(), img, intersectRect.Min, draw.Src)
			img = croppedImg
		}
	}

	// --- グレースケール変換 ---
	if grayscale {
		bounds := img.Bounds()
		grayImg := image.NewGray(bounds)
		draw.Draw(grayImg, bounds, img, image.Point{}, draw.Src)
		img = grayImg
	}

	// --- リサイズ処理 ---
	if width > 0 || height > 0 {
		img = resize.Resize(width, height, img, resize.Lanczos3)
	}

	// --- 指定されたフォーマットにエンコード ---
	buf := new(bytes.Buffer)
	switch outputFormat {
	case "jpeg":
		err = jpeg.Encode(buf, img, &jpeg.Options{Quality: quality})
	case "png":
		encoder := &png.Encoder{CompressionLevel: png.BestCompression}
		err = encoder.Encode(buf, img)
	default:
		return js.ValueOf("Error: Unsupported format " + outputFormat)
	}

	if err != nil {
		return js.ValueOf("Error encoding image: " + err.Error())
	}

	// --- 結果をJavaScriptに返す ---
	dst := js.Global().Get("Uint8Array").New(buf.Len())
	js.CopyBytesToJS(dst, buf.Bytes())

	return dst
}

func main() {
	fmt.Println("Go WebAssembly Initialized")
	// "add" という名前でGoのadd関数をJavaScriptのグローバルスコープに公開します。
	js.Global().Set("add", js.FuncOf(add))
	js.Global().Set("processImage", js.FuncOf(processImage))

	// Goプログラムが終了しないように待機します。
	<-make(chan bool)
}
