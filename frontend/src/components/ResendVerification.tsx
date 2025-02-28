// src/components/ResendVerification.tsx
import { useState } from 'react';
import { TextInput, Button, Paper, Title, Text } from '@mantine/core';
import { useForm } from '@mantine/form';

export function ResendVerification() {
  const [status, setStatus] = useState<{ type: 'error' | 'success' | null; message: string }>({
    type: null,
    message: ''
  });

  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const response = await fetch('http://localhost:5000/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setStatus({
        type: 'success',
        message: data.message
      });
      form.reset();
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'An error occurred'
      });
    }
  };

  return (
    <Paper radius="md" p="xl" withBorder>
      <Title order={2} mb="md">Resend Verification Email</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          required
          label="Email"
          placeholder="your@email.com"
          {...form.getInputProps('email')}
        />
        {status.message && (
          <Text color={status.type === 'success' ? 'green' : 'red'} size="sm" mt="sm">
            {status.message}
          </Text>
        )}
        <Button type="submit" fullWidth mt="xl">
          Resend Verification Email
        </Button>
      </form>
    </Paper>
  );
}