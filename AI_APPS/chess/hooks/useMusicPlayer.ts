import { useState, useRef, useCallback, useEffect } from 'react';
import { Track } from '../types';

export const useMusicPlayer = () => {
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentTrack = currentTrackIndex !== null ? playlist[currentTrackIndex] : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (currentTrack && audio) {
      audio.src = currentTrack.url;
      audio.load();
      if (isPlaying) {
        audio.play().catch(error => console.error("Error playing new track:", error));
      }
    } else if (!currentTrack && audio) {
      audio.pause();
      audio.src = ""; 
      setProgress(0);
      setDuration(0);
      // setIsPlaying(false); // Let the pause event handler do this
    }
  }, [currentTrack]); // Removed isPlaying dependency here as play logic is complex inside. Rely on explicit play commands.

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => playNextTrack();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // playNextTrack should be stable or wrapped in useCallback if used directly here.

  const addTracks = useCallback((files: File[]) => {
    const newTracks: Track[] = files
      .filter(file => file.type === 'audio/mpeg' || file.type === 'audio/mp3')
      .map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        url: URL.createObjectURL(file),
        file,
      }));
    
    setPlaylist(prev => {
        const uniqueNewTracks = newTracks.filter(nt => !prev.some(pt => pt.name === nt.name && pt.file.size === nt.file.size)); // Basic duplicate check
        const updatedPlaylist = [...prev, ...uniqueNewTracks];
        if (currentTrackIndex === null && updatedPlaylist.length > 0) {
            setCurrentTrackIndex(0); // Auto-select first track if playlist was empty
        }
        return updatedPlaylist;
    });
  }, [currentTrackIndex]);

  const removeTrack = useCallback((trackId: string) => {
    const trackToRemoveIndex = playlist.findIndex(t => t.id === trackId);
    if (trackToRemoveIndex === -1) return;

    const trackToRemove = playlist[trackToRemoveIndex];
    URL.revokeObjectURL(trackToRemove.url);

    const newPlaylist = playlist.filter(t => t.id !== trackId);
    setPlaylist(newPlaylist);

    if (currentTrackIndex === trackToRemoveIndex) {
        if (newPlaylist.length === 0) {
            setCurrentTrackIndex(null);
            setIsPlaying(false); 
        } else if (trackToRemoveIndex >= newPlaylist.length) { // If it was the last track
            setCurrentTrackIndex(newPlaylist.length - 1);
        } else {
            // currentTrackIndex remains, the track at this index is now the next one.
            // The useEffect for currentTrack will handle reloading.
            // If it was playing, continue playing the new track at this index.
            if (isPlaying && audioRef.current) {
                 // useEffect on currentTrack will handle src update and play if isPlaying is true
            }
        }
    } else if (currentTrackIndex !== null && trackToRemoveIndex < currentTrackIndex) {
        setCurrentTrackIndex(prevIdx => prevIdx! - 1);
    }
  }, [playlist, currentTrackIndex, isPlaying]);


  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => console.error("Error playing track:", error));
    }
    //setIsPlaying(!isPlaying); // Event listeners 'play'/'pause' on audio element will handle this
  }, [isPlaying, currentTrack]);

  const playTrackById = useCallback((trackId: string) => {
    const trackIndex = playlist.findIndex(t => t.id === trackId);
    if (trackIndex !== -1) {
      if (currentTrackIndex === trackIndex && audioRef.current) {
        togglePlayPause();
      } else {
        setCurrentTrackIndex(trackIndex);
        setIsPlaying(true); // Explicitly set to play, useEffect on currentTrack will handle loading and actual play
        if(audioRef.current && audioRef.current.src !== playlist[trackIndex].url) { // ensure src is updated before play
            audioRef.current.src = playlist[trackIndex].url;
            audioRef.current.load();
        }
        audioRef.current?.play().catch(e => console.error("Error in playTrackById:", e));
      }
    }
  }, [playlist, currentTrackIndex, togglePlayPause]);

  const playNextTrack = useCallback(() => {
    if (playlist.length === 0) return;
    setCurrentTrackIndex(prev => {
        const nextIndex = (prev === null || prev === playlist.length - 1) ? 0 : prev + 1;
        if (playlist[nextIndex]) { // ensure track exists
            setIsPlaying(true);
             if(audioRef.current && audioRef.current.src !== playlist[nextIndex].url) {
                audioRef.current.src = playlist[nextIndex].url;
                audioRef.current.load();
            }
            audioRef.current?.play().catch(e => console.error("Error in playNextTrack:", e));
        }
        return nextIndex;
    });
  }, [playlist]);

  const playPrevTrack = useCallback(() => {
    if (playlist.length === 0) return;
    setCurrentTrackIndex(prev => {
        const prevIndex = (prev === null || prev === 0) ? playlist.length - 1 : prev - 1;
         if (playlist[prevIndex]) { // ensure track exists
            setIsPlaying(true);
            if(audioRef.current && audioRef.current.src !== playlist[prevIndex].url) {
                audioRef.current.src = playlist[prevIndex].url;
                audioRef.current.load();
            }
            audioRef.current?.play().catch(e => console.error("Error in playPrevTrack:", e));
        }
        return prevIndex;
    });
  }, [playlist]);

  const seek = useCallback((time: number) => {
    if (audioRef.current && !isNaN(time)) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);
  
  useEffect(() => {
    return () => {
      playlist.forEach(track => URL.revokeObjectURL(track.url));
    };
  }, [playlist]);

  return {
    playlist,
    currentTrack,
    currentTrackIndex, // Exposed for MusicPlayer button disabling logic
    isPlaying,
    audioRef,
    progress,
    duration,
    addTracks,
    removeTrack,
    togglePlayPause,
    playNextTrack,
    playPrevTrack,
    playTrackById,
    seek,
  };
};
