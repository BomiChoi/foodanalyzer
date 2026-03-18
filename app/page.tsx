'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface FoodItem {
  name: string;
  serving: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

interface Citation {
  url: string;
  title: string;
}

interface AnalysisResult {
  foods: FoodItem[];
  totalCalories: number;
  summary: string;
  citations: Citation[];
}

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '분석 실패');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">음식 칼로리 분석기</h1>
          <p className="text-gray-500">음식 사진을 올리면 AI가 칼로리를 분석해드립니다</p>
        </div>

        {/* Upload Area */}
        <div
          className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {imageUrl ? (
            <div className="relative w-full h-64">
              <Image
                src={imageUrl}
                alt="업로드된 음식"
                fill
                className="object-contain rounded-xl"
              />
            </div>
          ) : (
            <div className="text-gray-400 py-8">
              <div className="text-6xl mb-3">🍽️</div>
              <p className="text-base font-medium">클릭하여 음식 사진 업로드</p>
              <p className="text-sm mt-1">JPG, PNG, WEBP 지원</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Analyze Button */}
        {imageUrl && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-4 w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold transition-colors"
          >
            {loading ? '분석 중...' : '칼로리 분석하기'}
          </button>
        )}

        {/* Loading */}
        {loading && (
          <p className="mt-4 text-center text-gray-500 text-sm animate-pulse">
            AI가 음식을 인식하고 칼로리 정보를 검색하고 있습니다...
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Result Table */}
        {result && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {result.summary && (
              <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 text-sm text-gray-600">
                {result.summary}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3">음식명</th>
                    <th className="text-center px-3 py-3">제공량</th>
                    <th className="text-center px-3 py-3">칼로리</th>
                    <th className="text-center px-3 py-3">탄수화물</th>
                    <th className="text-center px-3 py-3">단백질</th>
                    <th className="text-center px-3 py-3">지방</th>
                  </tr>
                </thead>
                <tbody>
                  {result.foods.map((food, i) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{food.name}</td>
                      <td className="px-3 py-3 text-center text-gray-500">{food.serving}</td>
                      <td className="px-3 py-3 text-center font-semibold text-orange-500">
                        {food.calories} kcal
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600">{food.carbs}g</td>
                      <td className="px-3 py-3 text-center text-gray-600">{food.protein}g</td>
                      <td className="px-3 py-3 text-center text-gray-600">{food.fat}g</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-orange-50">
                    <td colSpan={2} className="px-5 py-3 font-semibold text-gray-700">합계</td>
                    <td className="px-3 py-3 text-center font-bold text-orange-600 text-base">
                      {result.totalCalories} kcal
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Citations */}
        {result && result.citations?.length > 0 && (
          <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">참고 출처</p>
            <ul className="space-y-1">
              {result.citations.map((c, i) => (
                <li key={i} className="text-sm">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline break-all"
                  >
                    {c.title || c.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
