import React from 'react';
import { Track } from '../../types';
import { Button } from '../ui/Button';
import { PlayIcon, TrashIcon, PauseIcon } from '../ui/Icons';

interface PlaylistItemProps {
  track: Track;
  onPlay: (trackId: string) => void;
  onRemove: (trackId: string) => void;
  isPlaying: boolean;
  isCurrentTrack: boolean;
}

export const PlaylistItem: React.FC<PlaylistItemProps> = ({ track, onPlay, onRemove, isPlaying, isCurrentTrack }) => {
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200
        ${isCurrentTrack ? 'bg-purple-700 shadow-lg ring-2 ring-purple-500' : 'bg-gray-700 hover:bg-gray-600'}`}
    >
      <span className={`truncate ${isCurrentTrack ? 'text-purple-300 font-semibold' : 'text-gray-200'}`} title={track.name}>
        {track.name}
      </span>
      <div className="flex items-center space-x-2">
        <Button 
          onClick={() => onPlay(track.id)} 
          variant="ghost" 
          className="p-2"
          title={isPlaying && isCurrentTrack ? "Pause" : "Play"}
        >
          {isPlaying && isCurrentTrack ? <PauseIcon className="w-5 h-5 text-yellow-400" /> : <PlayIcon className="w-5 h-5 text-green-400" />}
        </Button>
        <Button 
          onClick={() => onRemove(track.id)} 
          variant="ghost" 
          className="p-2"
          title="Remove track"
        >
          <TrashIcon className="w-5 h-5 text-red-400 hover:text-red-300" />
        </Button>
      </div>
    </div>
  );
};
