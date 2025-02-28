 
// AvatarDisplay.tsx
import { useState, useEffect } from 'react';
import { Avatar ,Loader} from '@mantine/core';

interface AvatarDisplayProps {
  avatarUrl?: string;
  size?: string | number;
  onError?: () => void;
  fallbackInitials?: string;
}

export const AvatarDisplay = ({ 
  avatarUrl, 
  size = 'xl', 
  onError,
  fallbackInitials = '?'
}: AvatarDisplayProps) => {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset error state when URL changes
    setImgError(false);
    setIsLoading(true);
  }, [avatarUrl]);

  const handleError = () => {
    console.error('Failed to load avatar:', avatarUrl);
    setImgError(true);
    setIsLoading(false);
    onError?.();
  };

  // const handleLoad = () => {
  //   setImgError(false);
  //   setIsLoading(false);
  // };

  return (
    <Avatar
      src={imgError || !avatarUrl ? undefined : avatarUrl}
      size={size}
      radius="xl"
      onError={handleError}
      onLoad={() => setIsLoading(false)}
    >
      {isLoading ? (
        <Loader /> // Render a loading indicator while the avatar is loading
      ) : (
        (imgError || !avatarUrl) && fallbackInitials
      )}
    </Avatar>
  );
};