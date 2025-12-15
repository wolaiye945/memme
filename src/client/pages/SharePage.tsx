import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

export default function SharePage() {
  const { code } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShare = async () => {
      try {
        const res = await api.get<any>(`/share/${code}`);
        setData(res);
      } catch (err: any) {
        setError(err.message || '分享内容不存在或已过期');
      } finally {
        setLoading(false);
      }
    };
    fetchShare();
  }, [code]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  const { memory, author } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">{memory.title}</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                由 {author.username} 分享于 {formatDate(memory.createdAt)}
              </p>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="prose max-w-none text-gray-900 whitespace-pre-wrap">
              {memory.content}
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Powered by <a href="/" className="text-primary-600 hover:text-primary-500">MemMe</a>
          </p>
        </div>
      </div>
    </div>
  );
}
