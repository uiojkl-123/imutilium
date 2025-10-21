'use client';

import React, { useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default function GifConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isConverting, setIsConverting] = useState(false);
  const [quality, setQuality] = useState<number>(80);

  const ffmpeg = new FFmpeg();

  const handleConvert = async () => {
    if (!file) return;
    setIsConverting(true);
    setOutputUrl(null);

    try {
      // FFmpeg 로드
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          'text/javascript'
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          'application/wasm'
        ),
      });

      // 파일을 메모리에 쓰기
      await ffmpeg.writeFile('input.gif', await fetchFile(file));

      // 진행률 콜백
      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      // GIF → GIF (화질 조절 포함)
      const qualityValue = Math.round((100 - quality) * 0.31); // 0-100을 0-31로 변환
      await ffmpeg.exec([
        '-i',
        'input.gif',
        '-vf',
        `split[s0][s1];[s0]palettegen=stats_mode=single[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`,
        '-loop',
        '0',
        '-f',
        'gif',
        '-compression_level',
        qualityValue.toString(),
        'output.gif',
      ]);

      const data = await ffmpeg.readFile('output.gif');
      // @ts-ignore
      const url = URL.createObjectURL(new Blob([data], { type: 'image/gif' }));
      setOutputUrl(url);
    } catch (error) {
      console.error('변환 중 오류 발생:', error);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <main className="p-8 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">🎞 GIF Converter (Web)</h1>

      <div className="w-full max-w-md mb-6">
        <input
          type="file"
          accept="image/gif"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4 w-full"
        />

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            화질 조절: {quality}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${quality}%, #e5e7eb ${quality}%, #e5e7eb 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>낮은 품질 (작은 파일)</span>
            <span>높은 품질 (큰 파일)</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleConvert}
        disabled={!file || isConverting}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
        {isConverting ? `변환 중... (${progress}%)` : 'GIF 변환하기'}
      </button>

      {outputUrl && (
        <div className="mt-6 text-center">
          <a
            href={outputUrl}
            download="output.gif"
            className="inline-block px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            결과 GIF 다운로드
          </a>
        </div>
      )}
    </main>
  );
}
