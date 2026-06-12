"use client";
import { useEffect, useState } from 'react';
import { getCurrentTime, initServerTime } from '@/utils/time';
import { differenceInSeconds } from 'date-fns';

export default function CountdownTimer({ kickoffTime, onExpire }: { kickoffTime: string, onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initServerTime().then(() => {
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // Đóng dự đoán trước 1 tiếng
    const targetDate = new Date(new Date(kickoffTime).getTime() - 60 * 60 * 1000);
    
    const updateTimer = () => {
      const now = getCurrentTime();
      const diff = differenceInSeconds(targetDate, now);

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        if (onExpire) onExpire();
      } else {
        setIsExpired(false);
        setTimeLeft({
          d: Math.floor(diff / (24 * 3600)),
          h: Math.floor((diff % (24 * 3600)) / 3600),
          m: Math.floor((diff % 3600) / 60),
          s: diff % 60
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [kickoffTime, isReady, onExpire]);

  if (!isReady || (!timeLeft && !isExpired)) return <div className="text-sm opacity-50 font-mono text-center mt-2">Đang đồng bộ giờ Server...</div>;

  if (isExpired || !timeLeft) return (
    <div className="flex items-center gap-2 font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/30 w-fit mx-auto mt-2 text-sm shadow-[0_0_10px_rgba(255,0,0,0.3)]">
      🔒 ĐÃ ĐÓNG DỰ ĐOÁN
    </div>
  );

  return (
    <div className="flex flex-col items-center mt-2 animate-fade-in">
      <div className="text-xs uppercase font-bold text-gray-400 mb-1 tracking-wider">Đóng dự đoán sau</div>
      <div className="flex gap-2">
        {timeLeft.d > 0 && (
          <div className="flex flex-col items-center bg-black/40 border border-gray-700/50 rounded-lg px-2 py-1 min-w-[3rem]">
            <span className="text-lg font-mono font-bold text-white leading-none">{timeLeft.d}</span>
            <span className="text-[0.6rem] text-gray-500 uppercase mt-0.5">Ngày</span>
          </div>
        )}
        <div className="flex flex-col items-center bg-black/40 border border-gray-700/50 rounded-lg px-2 py-1 min-w-[3rem]">
          <span className="text-lg font-mono font-bold text-white leading-none">{timeLeft.h.toString().padStart(2, '0')}</span>
          <span className="text-[0.6rem] text-gray-500 uppercase mt-0.5">Giờ</span>
        </div>
        <div className="text-xl font-bold text-gray-500 self-start mt-0.5">:</div>
        <div className="flex flex-col items-center bg-black/40 border border-gray-700/50 rounded-lg px-2 py-1 min-w-[3rem]">
          <span className="text-lg font-mono font-bold text-white leading-none">{timeLeft.m.toString().padStart(2, '0')}</span>
          <span className="text-[0.6rem] text-gray-500 uppercase mt-0.5">Phút</span>
        </div>
        <div className="text-xl font-bold text-gray-500 self-start mt-0.5">:</div>
        <div className="flex flex-col items-center bg-black/40 border border-cyan-500/30 rounded-lg px-2 py-1 min-w-[3rem] shadow-[0_0_10px_rgba(0,255,255,0.1)]">
          <span className="text-lg font-mono font-bold text-cyan-400 leading-none">{timeLeft.s.toString().padStart(2, '0')}</span>
          <span className="text-[0.6rem] text-cyan-700 uppercase mt-0.5">Giây</span>
        </div>
      </div>
    </div>
  );
}
