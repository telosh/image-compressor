"use client";

import { useState, useEffect, useRef } from 'react';

// TypeScriptがGoから渡されるグローバルなオブジェクトを認識できるように型定義を追加します。
declare global {
  interface Window {
    Go: new () => GoInstance;
    processImage: (imageData: Uint8Array, options: ProcessOptions) => Uint8Array | string;
  }
}

// Goインスタンスの基本的な型を定義
interface GoInstance {
  importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): Promise<void>;
}

interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProcessOptions {
  format: 'jpeg' | 'png';
  quality: number;
  width: number;
  height: number;
  grayscale: boolean;
  crop?: Crop;
}

interface ImageInfo {
  url: string;
  width: number;
  height: number;
  size: number; // bytes
}

// --- ヘルパー関数 ---
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const presets = {
  'Icon (1:1)': { width: 256, height: 256 },
  'Twitter (16:9)': { width: 1200, height: 675 },
  'OGP (1.91:1)': { width: 1200, height: 630 },
};

export default function Home() {
  const [wasmReady, setWasmReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 元画像
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalInfo, setOriginalInfo] = useState<ImageInfo | null>(null);
  const originalImageRef = useRef<HTMLImageElement>(null);

  // 処理後画像
  const [processedInfo, setProcessedInfo] = useState<ImageInfo | null>(null);

  // 処理オプション
  const [jpegQuality, setJpegQuality] = useState(80);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [grayscale, setGrayscale] = useState(false);
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png'>('jpeg');

  useEffect(() => {
    let go: GoInstance;
    const loadWasm = async () => {
      // wasm_exec.jsを読み込む
      const goScript = document.createElement('script');
      goScript.src = '/wasm_exec.js';
      document.body.appendChild(goScript);
      
      goScript.onload = async () => {
        go = new window.Go();
        const wasmModule = await WebAssembly.instantiateStreaming(fetch('/main.wasm'), go.importObject);
        go.run(wasmModule.instance);
        setWasmReady(true);
      };
    };
    loadWasm();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // 既存のURLを解放
      if (originalInfo?.url) URL.revokeObjectURL(originalInfo.url);
      if (processedInfo?.url) URL.revokeObjectURL(processedInfo.url);
      
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setOriginalInfo({ url, width: img.width, height: img.height, size: file.size });
        setWidth(img.width);
        setHeight(img.height);
      };
      img.src = url;

      setProcessedInfo(null);
      setError(null);
    }
  };

  const applyPreset = (width: number, height: number) => {
    if (!originalInfo) return;

    // 画像中央にプリセットサイズを配置
    const newCropWidth = Math.min(originalInfo.width, width);
    const newCropHeight = Math.min(originalInfo.height, height);
    const newCropX = Math.floor((originalInfo.width - newCropWidth) / 2);
    const newCropY = Math.floor((originalInfo.height - newCropHeight) / 2);

    setCrop({
      x: newCropX,
      y: newCropY,
      width: newCropWidth,
      height: newCropHeight,
    });

    // 出力サイズもプリセットに合わせる
    setWidth(width);
    setHeight(height);
    setKeepAspectRatio(false); // プリセット適用時はアスペクト比固定を解除
  };

  const handleProcessImage = async () => {
    if (!selectedFile || !wasmReady || !originalInfo) return;

    // PNGに対して何も変更がない場合は、再処理せずに元のファイルをコピーする
    if (
      outputFormat === 'png' &&
      !grayscale &&
      width === originalInfo.width &&
      height === originalInfo.height
    ) {
      setProcessedInfo({ ...originalInfo });
      return;
    }
    
    setIsProcessing(true);
    setProcessedInfo(null);
    setError(null);

    const fileBuffer = await selectedFile.arrayBuffer();
    const imageData = new Uint8Array(fileBuffer);
    
    const options: ProcessOptions = {
      format: outputFormat,
      quality: jpegQuality,
      width: width,
      height: height,
      grayscale: grayscale,
    };
    if (crop && crop.width > 0 && crop.height > 0) {
      options.crop = crop;
    }
    
    const result = window.processImage(imageData, options);

    setIsProcessing(false);
    if (typeof result === 'string') {
      setError(result);
      return;
    }

    const blob = new Blob([result], { type: `image/${outputFormat}` });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
        setProcessedInfo({ url, width: img.width, height: img.height, size: blob.size });
    };
    img.src = url;
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value, 10) || 0;
    setWidth(newWidth);
    if (keepAspectRatio && originalInfo) {
      const aspectRatio = originalInfo.height / originalInfo.width;
      setHeight(Math.round(newWidth * aspectRatio));
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value, 10) || 0;
    setHeight(newHeight);
    if (keepAspectRatio && originalInfo) {
      const aspectRatio = originalInfo.width / originalInfo.height;
      setWidth(Math.round(newHeight * aspectRatio));
    }
  };

  const handleCropChange = (axis: keyof Crop, value: string) => {
    const intValue = parseInt(value, 10) || 0;
    setCrop(prev => ({ ...(prev || { x: 0, y: 0, width: 0, height: 0 }), [axis]: intValue }));
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gray-100">
      <div className="w-full max-w-7xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800">高速画像コンプレッサー</h1>
          <p className="text-lg text-gray-600 mt-2">Go (WASM) を利用して画像をクライアントサイドで高速に処理します。</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* --- 操作パネル --- */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 border-b pb-3">コントロールパネル</h2>

            {/* 1. アップロード */}
            <div className="mb-6">
              <label htmlFor="image-upload" className="block text-lg font-medium text-gray-700 mb-2">
                1. 画像を選択
              </label>
              <input
                id="image-upload" type="file" accept="image/png, image/jpeg" onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* 2. リサイズ */}
            <div className={`mb-6 transition-opacity duration-300 ${!originalInfo ? 'opacity-50' : ''}`}>
              <h3 className="text-lg font-medium text-gray-700 mb-2">2. リサイズ</h3>
              <div className="flex items-center space-x-2 mb-2">
                <input type="text" value={width} onChange={handleWidthChange} disabled={!originalInfo} className="w-full p-2 border rounded-md text-center" />
                <span className="text-gray-500">x</span>
                <input type="text" value={height} onChange={handleHeightChange} disabled={!originalInfo} className="w-full p-2 border rounded-md text-center" />
              </div>
              <div className="flex items-center">
                <input id="aspect-ratio" type="checkbox" checked={keepAspectRatio} onChange={(e) => setKeepAspectRatio(e.target.checked)} disabled={!originalInfo} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="aspect-ratio" className="ml-2 block text-sm text-gray-900">アスペクト比を維持</label>
              </div>
            </div>
            
            {/* 2.5 切り抜き */}
            <div className={`mb-6 transition-opacity duration-300 ${!originalInfo ? 'opacity-50' : ''}`}>
              <h3 className="text-lg font-medium text-gray-700 mb-2">2.5 切り抜き (オプション)</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input type="text" placeholder="X" value={crop?.x ?? ''} onChange={(e) => handleCropChange('x', e.target.value)} disabled={!originalInfo} className="w-full p-2 border rounded-md text-center" />
                <input type="text" placeholder="Y" value={crop?.y ?? ''} onChange={(e) => handleCropChange('y', e.target.value)} disabled={!originalInfo} className="w-full p-2 border rounded-md text-center" />
                <input type="text" placeholder="Width" value={crop?.width ?? ''} onChange={(e) => handleCropChange('width', e.target.value)} disabled={!originalInfo} className="w-full p-2 border rounded-md text-center" />
                <input type="text" placeholder="Height" value={crop?.height ?? ''} onChange={(e) => handleCropChange('height', e.target.value)} disabled={!originalInfo} className="w-full p-2 border rounded-md text-center" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">プリセット</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(presets).map(([name, { width, height }]) => (
                    <button key={name} onClick={() => applyPreset(width, height)} disabled={!originalInfo} className="px-3 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 3. カラー */}
            <div className={`mb-6 transition-opacity duration-300 ${!originalInfo ? 'opacity-50' : ''}`}>
              <h3 className="text-lg font-medium text-gray-700 mb-2">3. 出力設定</h3>
              {/* フォーマット選択 */}
              <div className="flex items-center space-x-4 mb-4">
                  <button onClick={() => setOutputFormat('jpeg')} disabled={!originalInfo} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${outputFormat === 'jpeg' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                      JPEG
                  </button>
                  <button onClick={() => setOutputFormat('png')} disabled={!originalInfo} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${outputFormat === 'png' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                      PNG
                  </button>
              </div>

              {/* グレースケール */}
              <div className="flex items-center">
                <input id="grayscale" type="checkbox" checked={grayscale} onChange={(e) => setGrayscale(e.target.checked)} disabled={!originalInfo} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="grayscale" className="ml-2 block text-sm text-gray-900">グレースケールに変換</label>
              </div>
            </div>

            {/* 4. 圧縮 (JPEGのみ) */}
            <div className={`mb-6 transition-all duration-300 ${!originalInfo || outputFormat !== 'jpeg' ? 'opacity-50 max-h-0 overflow-hidden' : 'max-h-40'}`}>
                <label htmlFor="jpeg-quality" className="block text-lg font-medium text-gray-700 mb-2">
                4. JPEG圧縮品質 ({jpegQuality})
                </label>
                <input
                id="jpeg-quality" type="range" min="1" max="100" value={jpegQuality}
                onChange={(e) => setJpegQuality(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={!originalInfo || outputFormat !== 'jpeg'}
                />
            </div>
            
            {/* 実行ボタン */}
            {originalInfo && (
              <div className="mt-8">
                <button
                  onClick={handleProcessImage}
                  disabled={!wasmReady || isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105"
                >
                  {isProcessing ? '処理中...' : '画像処理を実行'}
                </button>
              </div>
            )}

             {error && (
              <div className="mt-4 text-center p-3 bg-red-100 text-red-700 rounded-lg">
                <p>エラー: {error}</p>
              </div>
            )}
          </div>

          {/* --- 画像表示エリア --- */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4 text-center">元の画像</h2>
              {originalInfo ? (
                <div>
                  <img ref={originalImageRef} src={originalInfo.url} alt="Original" className="max-w-full h-auto rounded-lg mx-auto shadow-md border" />
                  <div className="mt-4 text-center text-gray-600">
                    <p>{originalInfo.width} x {originalInfo.height}</p>
                    <p className="font-bold">{formatBytes(originalInfo.size)}</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                  画像を選択してください
                </div>
              )}
            </div>
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4 text-center">処理後の画像</h2>
              {isProcessing && <div className="w-full h-80 flex items-center justify-center"><p className="text-gray-500 animate-pulse text-lg">処理中です...</p></div>}
              {processedInfo ? (
                <div>
                  <img src={processedInfo.url} alt="Processed" className="max-w-full h-auto rounded-lg mx-auto shadow-md border" />
                  <div className="mt-4 text-center text-gray-600">
                     <p>{processedInfo.width} x {processedInfo.height}</p>
                    <p className="font-bold">{formatBytes(processedInfo.size)}</p>
                    <a 
                      href={processedInfo.url} 
                      download={`processed-${selectedFile?.name?.replace(/(\.png|\.jpeg|\.jpg)$/, '')}.${outputFormat}`}
                      className="mt-4 inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      ダウンロード
                    </a>
                  </div>
                </div>
              ) : (
                !isProcessing && <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                  ここに処理後の画像が表示されます
                </div>
              )}
            </div>
          </div>
        </div>
        <footer className="mt-8 text-center text-gray-500">
         <p>WASM Status: {wasmReady ? <span className="text-green-500 font-semibold">Ready</span> : <span className="text-yellow-500 font-semibold">Loading...</span>}</p>
       </footer>
      </div>
    </main>
  );
}
