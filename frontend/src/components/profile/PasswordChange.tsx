// src/components/profile/PasswordChange.tsx
import { Card, Title, Stack, PasswordInput, Alert, Group, Button } from "@mantine/core";
import { useState } from "react";
import api  from "../../utils/api/axios";

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
interface ApiError {
    response?: {
      data?: {
        error?: string;
      };
    };
  }
export const PasswordChange = () => {
  const [formData, setFormData] = useState<PasswordChangeForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Explicit type
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => { // Correct event type
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.put('/dashboard/profile/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) { // Type assertion for err
        const error = err as ApiError;
        console.error('Failed to change Password:', error);
        setError(error.response?.data?.error || 'Failed to change Password. Please try again.'); 
    }
    finally {
        setLoading(false);
    }
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder mt="xl">
      <Title order={3} mb="md">Change Password</Title>
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <PasswordInput
            label="Current Password"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            required
          />
          <PasswordInput
            label="New Password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            required
          />
          <PasswordInput
            label="Confirm New Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />
        </Stack>

        {error && (
          <Alert color="red" mt="md">
            {error}
          </Alert>
        )}

        {success && (
          <Alert color="green" mt="md">
            Password updated successfully
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          <Button type="submit" loading={loading}>
            Update Password
          </Button>
        </Group>
      </form>
    </Card>
  );
};