import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

export default function ReviewPage() {
  const [period, setPeriod] = useState('DAY');
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/compression/preview?period=${period}`);
      setPreviewData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [period]);

  const handleCompress = async () => {
    if (!previewData?.memories?.length) return;
    if (!confirm(`确定要压缩这 ${previewData.memories.length} 条记忆吗？`)) return;

    setCompressing(true);
    try {
      await api.post('/compression/compress', {
        period,
        memoryIds: previewData.memories.map((m: any) => m.id),
      });
      alert('压缩成功！');
      fetchPreview(); // Refresh
    } catch (error) {
      console.error(error);
      alert('压缩失败');
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">记忆回顾与压缩</h1>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          {['DAY', 'WEEK', 'MONTH', 'YEAR'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                period === p ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p === 'DAY' ? '每日' : p === 'WEEK' ? '每周' : p === 'MONTH' ? '每月' : '每年'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">加载中...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-medium">待回顾记忆 ({previewData?.count || 0})</h2>
            {previewData?.memories?.length > 0 ? (
              <div className="space-y-4">
                {previewData.memories.map((memory: any) => (
                  <div key={memory.id} className="card p-4">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-medium">{memory.title}</h3>
                      <span className="text-xs text-gray-500">{formatDate(memory.createdAt)}</span>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2">{memory.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                当前周期没有待压缩的记忆
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card p-6 sticky top-24">
              <h2 className="text-lg font-medium mb-4">操作</h2>
              <p className="text-sm text-gray-600 mb-6">
                压缩操作将把左侧的所有记忆合并生成一个新的摘要记忆，原始记忆将被标记为已压缩。
              </p>
              <button
                onClick={handleCompress}
                disabled={!previewData?.memories?.length || compressing}
                className="w-full btn btn-primary"
              >
                {compressing ? '正在生成摘要...' : '生成回顾摘要'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
