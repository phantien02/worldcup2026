"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProfileUpdateForm({ user }: { user: any }) {
  const [displayName, setDisplayName] = useState(user.user_metadata?.display_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      // 1. Cập nhật Tên hiển thị
      if (displayName.trim() !== user.user_metadata?.display_name) {
        if (!displayName.trim()) throw new Error("Tên hiển thị không được để trống!");
        
        const { error: updateAuthError } = await supabase.auth.updateUser({
          data: { display_name: displayName.trim() }
        });
        if (updateAuthError) throw updateAuthError;

        const { error: updateDbError } = await supabase
          .from('profiles')
          .update({ display_name: displayName.trim() })
          .eq('id', user.id);
        if (updateDbError) throw updateDbError;
      }

      // 2. Cập nhật Mật khẩu (nếu có nhập)
      if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword) throw new Error("Vui lòng nhập Mật khẩu hiện tại để xác thực!");
        if (newPassword.length < 6) throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự!");
        if (newPassword !== confirmPassword) throw new Error("Xác nhận mật khẩu mới không khớp!");

        // Xác thực mật khẩu cũ bằng cách thử đăng nhập
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInError) {
          throw new Error("Mật khẩu hiện tại không chính xác!");
        }

        // Nếu đúng mật khẩu cũ, tiến hành đổi mật khẩu mới
        const { error: updatePwdError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updatePwdError) throw updatePwdError;
      }

      setMessage({ text: 'Cập nhật thông tin thành công!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Reload page after 1.5s to reflect name change globally
      setTimeout(() => window.location.reload(), 1500);

    } catch (error: any) {
      setMessage({ text: error.message || 'Có lỗi xảy ra, vui lòng thử lại.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {message.text && (
        <div className={`badge badge-${message.type} p-3 text-center mb-2`} style={{ fontSize: '1rem' }}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="font-bold text-gray-300">Tên hiển thị</label>
        <input 
          type="text" 
          value={displayName} 
          onChange={(e) => setDisplayName(e.target.value)}
          className="bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
          placeholder="Nhập tên hiển thị mới"
        />
      </div>

      <hr className="border-gray-800 my-4" />
      <h3 className="font-bold text-lg mb-2 text-gray-200 flex items-center gap-2">
        <span style={{ color: 'var(--warning)' }}>🔒</span> Đổi mật khẩu (Tùy chọn)
      </h3>

      <div className="flex flex-col gap-2">
        <label className="font-bold text-gray-300">Mật khẩu hiện tại</label>
        <input 
          type="password" 
          value={currentPassword} 
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
          placeholder="Nhập mật khẩu hiện tại"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-bold text-gray-300">Mật khẩu mới</label>
        <input 
          type="password" 
          value={newPassword} 
          onChange={(e) => setNewPassword(e.target.value)}
          className="bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
          placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
        />
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <label className="font-bold text-gray-300">Xác nhận mật khẩu mới</label>
        <input 
          type="password" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
          placeholder="Nhập lại mật khẩu mới"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="btn btn-primary w-full p-3 font-bold text-lg rounded-xl mt-2 transition-all"
        style={{ opacity: loading ? 0.7 : 1, filter: loading ? 'grayscale(50%)' : 'none' }}
      >
        {loading ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}
      </button>
    </form>
  );
}
