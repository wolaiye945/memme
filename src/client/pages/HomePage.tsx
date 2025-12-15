import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';

interface Memory {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  tags: { tag: { name: string; color: string } }[];
}

export default function HomePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchMemories = async () => {
    try {
      const data = await api.get<{ items: Memory[] }>(`/memories?search=${search}`);
      setMemories(data.items);
    } catch (error) {
      console.error('Failed to fetch memories', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记忆吗？')) return;
    try {
      await api.delete(`/memories/${id}`);
      setMemories(memories.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete memory', error);
    }
  };

  const handleShare = async (id: string) => {
    try {
      const res = await api.post<{ shareCode: string; url: string }>(`/share/${id}`, { days: 7 });
      const url = `${window.location.origin}/share/${res.shareCode}`;
      await navigator.clipboard.writeText(url);
      alert(`分享链接已复制到剪贴板：\n${url}\n(有效期7天)`);
    } catch (error) {
      console.error('Failed to share memory', error);
      alert('分享失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">我的记忆</h1>
        <Link to="/new" className="btn btn-primary">
          + 新建记忆
        </Link>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="搜索记忆..."
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-10">加载中...</div>
      ) : memories.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          还没有记忆，快去<Link to="/new" className="text-primary-600">创建第一条记忆</Link>吧！
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {memories.map((memory) => (
            <div key={memory.id} className="card p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{memory.title}</h3>
                <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(memory.createdAt)}</span>
              </div>
              <p className="text-gray-600 mb-4 line-clamp-3 flex-1">{memory.content}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {memory.tags.map(({ tag }) => (
                  <span key={tag.name} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                    #{tag.name}
                  </span>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button onClick={() => handleShare(memory.id)} className="text-sm text-primary-600 hover:text-primary-800">
                  分享
                </button>
                <button onClick={() => navigate(`/edit/${memory.id}`)} className="text-sm text-gray-600 hover:text-gray-800">
                  编辑
                </button>
                <button onClick={() => handleDelete(memory.id)} className="text-sm text-red-600 hover:text-red-800">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
