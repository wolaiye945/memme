import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, statsData] = await Promise.all([
          api.get<any[]>('/admin/users'),
          api.get<any>('/admin/stats'),
        ]);
        setUsers(usersData);
        setStats(statsData);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const handleUpdateQuota = async (userId: string) => {
    const quotaGB = prompt('请输入新的存储配额 (GB):', '1');
    if (!quotaGB) return;
    
    try {
      const quotaBytes = parseFloat(quotaGB) * 1024 * 1024 * 1024;
      await api.put(`/admin/users/${userId}/quota`, { quota: quotaBytes });
      alert('更新成功');
      // Refresh users
      const usersData = await api.get<any[]>('/admin/users');
      setUsers(usersData);
    } catch (error) {
      alert('更新失败');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">系统管理</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500">总用户数</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.userCount || 0}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500">总记忆数</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.memoryCount || 0}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-gray-500">已用存储</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {((Number(stats?.totalStorageUsed || 0)) / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">用户列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">存储使用</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">记忆数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {((Number(user.storageUsed)) / 1024 / 1024).toFixed(2)} MB / {((Number(user.storageQuota)) / 1024 / 1024 / 1024).toFixed(1)} GB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user._count.memories}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleUpdateQuota(user.id)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      修改配额
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
