// UserProfile.tsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuthHook';
import { Alert, TextInput, Button, Card, Group, Loader, Stack, Title, FileInput } from '@mantine/core';
import api  from '../../utils/api/axios';
import { AvatarDisplay } from './AvatarDisplay';
import { AxiosError } from 'axios';
import { PasswordChange } from './PasswordChange';

interface ProfileData {
  firstName: string;
  lastName: string;
  user_email: string;
  address: string;
  phone_number: string;
  avatar: string;
}

interface AvatarResponse {
  avatar_path: string;
}

export const UserProfile = () => {
  const { isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    user_email: '',
    address: '',
    phone_number: '',
    avatar: '',
  });
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  const getFullAvatarUrl = useCallback((path: string) => {
    if (!path) return '';
    const cleanPath = path.replace(/^\/+/, '');
    const baseUrl = import.meta.env.VITE_APP_API_BASE_URL.replace(/\/+$/, '');
    const avatarpath =`${baseUrl}/api/${cleanPath}`
    // console.log("Avatar path",avatarpath);
    return avatarpath;
  }, []);
  const handleError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
  };

  const handleSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 5000); // Clear success after 5 seconds
  };

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<ProfileData>('/dashboard/profile');
      if (response.data) {
        setFormData(response.data);
        if (response.data.avatar) {
          setAvatarUrl(getFullAvatarUrl(response.data.avatar));
        }
      } else {
        handleError('Profile data is missing');
      }
    } catch (err) {
      const errorMessage = err instanceof AxiosError 
        ? err.response?.data?.message || 'Failed to load profile'
        : 'Failed to load profile';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getFullAvatarUrl]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchProfile();
    }
  }, [isLoggedIn, fetchProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put<ProfileData>('/dashboard/profile', formData);
      handleSuccess('Profile updated successfully');
      await fetchProfile();
    } catch (err) {
      const errorMessage = err instanceof AxiosError 
        ? err.response?.data?.message || 'Failed to update profile'
        : 'Failed to update profile';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    const formData = new FormData();
    formData.append('file', avatarFile);

    try {
      setLoading(true);
      const response = await api.post<AvatarResponse>('/avatar/update-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      handleSuccess('Avatar updated successfully');
      setAvatarUrl(getFullAvatarUrl(response.data.avatar_path));
      setAvatarFile(null); // Clear the file input
    } catch (err) {
      const errorMessage = err instanceof AxiosError 
        ? err.response?.data?.message || 'Failed to upload avatar'
        : 'Failed to upload avatar';
      handleError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarError = () => {
    handleError('Failed to load avatar image');
  };

  if (!isLoggedIn) {
    return <Alert color="red" title="Authentication Required">Please log in to view your profile.</Alert>;
  }

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: '20px' }}>
      {loading && <Loader size="xl" />}
      {error && <Alert color="red" title="Error" mt="md">{error}</Alert>}
      {success && <Alert color="green" title="Success" mt="md">{success}</Alert>}

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={3} mb="md">Profile Settings</Title>
        <AvatarDisplay 
          avatarUrl={avatarUrl} 
          onError={handleAvatarError}
          fallbackInitials={`${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`}
        />

        <FileInput
          placeholder="Choose an avatar"
          label="Upload Avatar"
          accept="image/*"
          value={avatarFile}
          onChange={setAvatarFile}
        />
        <Button mt="md" onClick={handleAvatarUpload} disabled={!avatarFile || loading}>
          Upload Avatar
        </Button>

        <form onSubmit={handleProfileUpdate}>
          <Stack gap="sm">
            <TextInput label="First Name" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
            <TextInput label="Last Name" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
            <TextInput label="Email" value={formData.user_email} disabled />
            <TextInput label="Phone Number" name="phone_number" value={formData.phone_number} onChange={handleInputChange} />
            <TextInput label="Address" name="address" value={formData.address} onChange={handleInputChange} />
          </Stack>
          <Group justify="flex-end" mt="md">
            <Button type="submit" loading={loading}>Update Profile</Button>
          </Group>
        </form>
        <PasswordChange/>
      </Card>
    </div>
  );
};

export default UserProfile;