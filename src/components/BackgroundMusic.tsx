'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

// Danh sách nhạc mặc định (Bạn có thể tự thay link file mp3 của bạn vào đây)
const SONGS = [
  { title: "FIFA World Cup 2026 Theme", artist: "Official", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "Dreamers", artist: "Jungkook", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { title: "Hayya Hayya", artist: "Trinidad Cardona", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
];

export default function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSong, setCurrentSong] = useState(SONGS[0]);
  const [showPopup, setShowPopup] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Khởi tạo bài hát ngẫu nhiên khi vào trang
  useEffect(() => {
    const randomSong = SONGS[Math.floor(Math.random() * SONGS.length)];
    setCurrentSong(randomSong);
    
    // Thử auto-play. Trình duyệt có thể chặn autoplay nếu người dùng chưa tương tác
    const tryAutoplay = async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          setShowPopup(true);
        } catch (err) {
          // Bị chặn autoplay -> Đợi người dùng click bất kỳ đâu để bật nhạc
          const handleInteraction = () => {
            if (audioRef.current) {
              audioRef.current.play().then(() => {
                setIsPlaying(true);
                setShowPopup(true);
                document.removeEventListener('click', handleInteraction);
              }).catch(() => {});
            }
          };
          document.addEventListener('click', handleInteraction);
          return () => document.removeEventListener('click', handleInteraction);
        }
      }
    };
    
    tryAutoplay();
  }, []);

  // Phát bài tiếp theo ngẫu nhiên khi bài hiện tại kết thúc
  const playNextRandom = () => {
    const randomSong = SONGS[Math.floor(Math.random() * SONGS.length)];
    setCurrentSong(randomSong);
    setShowPopup(false);
    
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setShowPopup(true);
        }).catch(() => {});
      }
    }, 100);
  };

  // Toggle Mute
  const toggleMute = () => {
    if (audioRef.current) {
      if (!isPlaying) {
        // Nếu bị chặn autoplay từ đầu, bấm nút sẽ bắt đầu phát
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          if (!showPopup) setShowPopup(true);
        });
      }
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Ẩn pop-up sau 5 giây
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showPopup) {
      timeout = setTimeout(() => setShowPopup(false), 5000);
    }
    return () => clearTimeout(timeout);
  }, [showPopup]);

  return (
    <>
      <audio 
        ref={audioRef} 
        src={currentSong.url} 
        onEnded={playNextRandom} 
        preload="auto"
      />

      {/* Nút Bật/Tắt Nhạc (Góc dưới bên trái) */}
      <button
        onClick={toggleMute}
        className="hover-card"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 9999,
          padding: '12px',
          borderRadius: '50%',
          background: 'rgba(22, 27, 34, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: isMuted ? 'rgba(255, 255, 255, 0.5)' : '#00d2ff',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
        title="Tắt/Bật nhạc nền"
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>

      {/* Pop-up hiển thị tên bài hát (Trên cùng ở giữa) */}
      <div 
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: showPopup ? 'translate(-50%, 0)' : 'translate(-50%, -150%)',
          opacity: showPopup ? 1 : 0,
          zIndex: 9999,
          pointerEvents: 'none',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div 
          style={{
            background: 'rgba(9, 9, 12, 0.9)',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(111, 0, 255, 0.4)',
            maxWidth: '300px',
            padding: '12px 20px',
            borderRadius: '50px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Music size={20} color="#00d2ff" style={{ flexShrink: 0, animation: 'pulse 2s infinite' }} />
          
          <div style={{ width: '200px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{
              display: 'inline-block',
              animation: 'marquee 8s linear infinite'
            }}>
              <span style={{ fontWeight: 'bold', color: 'white', marginRight: '16px' }}>
                {currentSong.title}
              </span>
              <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
                - {currentSong.artist}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(200px); }
          100% { transform: translateX(-100%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}} />
    </>
  );
}
