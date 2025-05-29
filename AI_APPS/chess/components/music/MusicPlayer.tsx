import React from 'react';
import { useMusicPlayer } from '../../hooks/useMusicPlayer';
import { FileUpload } from './FileUpload';
import { PlaylistItem } from './PlaylistItem';
import { Button } from '../ui/Button';
import { PlayIcon, PauseIcon, NextIcon, PrevIcon } from '../ui/Icons';

export const MusicPlayer: React.FC = () => {
  const {
    playlist,
    currentTrack,
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
    seek
  } = useMusicPlayer();

  const handleFilesUpload = (files: FileList) => {
    addTracks(Array.from(files));
  };

  const formatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds) || timeInSeconds === Infinity) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto bg-gray-800 rounded-xl shadow-2xl space-y-6 border border-gray-700">
      <h2 className="text-3xl font-bold text-center text-purple-400 mb-2">Music Station</h2>
      
      <FileUpload onFileUpload={handleFilesUpload} />

      {/* Current Track & Controls */}
      {currentTrack && (
        <div className="p-4 bg-gray-700/50 rounded-lg shadow-md space-y-3">
          <p className="text-lg font-semibold text-purple-300 truncate" title={currentTrack.name}>
            Now Playing: {currentTrack.name}
          </p>
          <div className="flex items-center justify-center space-x-3">
            <Button onClick={playPrevTrack} disabled={playlist.length <= 1 && currentTrackIndex === 0} variant="ghost" className="p-3" title="Previous">
              <PrevIcon className="w-6 h-6" />
            </Button>
            <Button onClick={togglePlayPause} className="p-4 bg-purple-600 hover:bg-purple-500 rounded-full" title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
            </Button>
            <Button onClick={playNextTrack} disabled={playlist.length <= 1 && currentTrackIndex === playlist.length -1} variant="ghost" className="p-3" title="Next">
              <NextIcon className="w-6 h-6" />
            </Button>
          </div>
          {/* Progress Bar */}
          <div className="mt-2 space-y-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={progress || 0}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
              disabled={!currentTrack || duration === 0}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
      {!currentTrack && playlist.length > 0 && (
        <p className="text-center text-gray-400">Select a track to play.</p>
      )}


      {/* Playlist */}
      {playlist.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto p-1 rounded-md bg-gray-800/50">
           <h3 className="text-xl font-semibold text-purple-400 px-2 pt-2">Playlist ({playlist.length})</h3>
          {playlist.map((track) => (
            <PlaylistItem
              key={track.id}
              track={track}
              onPlay={() => playTrackById(track.id)}
              onRemove={() => removeTrack(track.id)}
              isPlaying={isPlaying && currentTrack?.id === track.id}
              isCurrentTrack={currentTrack?.id === track.id}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-6">
          No tracks in playlist. Upload some MP3s to get started!
        </p>
      )}
      
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};
