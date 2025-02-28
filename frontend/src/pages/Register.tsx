import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Container,
  Stack,
  Alert,
  FileInput,
  Grid,
  Select
} from '@mantine/core';
import { IconUpload, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import  api  from '../utils/api/axios';

interface FormData {
  firstName: string;
  lastName: string;
  role: string;
  user_email: string;
  password: string;
  confirmPassword: string;
  phone_number: string;
  address: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    role: 'user',
    user_email: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    address: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleChange = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    try {
      // Create a new object without confirmPassword
      const { 
        firstName, 
        lastName, 
        role, 
        user_email, 
        password, 
        phone_number, 
        address 
      } = formData;

      const registrationData = {
        firstName,
        lastName,
        role,
        user_email,
        password,
        phone_number,
        address
      };

      const response = await api.post('/auth/register', registrationData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 201 && response.data.user_id) {
        if (avatar) {
          const avatarData = new FormData();
          avatarData.append('file', avatar);
          
          try {
            const avatarResponse = await api.post(
              `/avatar/upload-avatar/${response.data.user_id}`, 
              avatarData, 
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                   
                },
              }
            );
            console.log('Avatar uploaded successfully:', avatarResponse.data);
          } catch (avatarError) {
            console.error('Avatar upload failed:', avatarError);
            // You might want to show a warning to the user that their avatar failed to upload
            // but the account was created successfully
          }
        }
        // Send verification email
                // await api.post('/auth/send-verification', {
                //   email: formData.user_email 
                // });
        setSuccess(true);

        setTimeout(() => {
          navigate('/login');
        }, 6000);
      }
    } catch (err) {
      const error = err as ApiError;
      console.error('Registration failed:', error);
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <Container size="sm" py="xl">
      <Paper radius="md" p="xl" withBorder>
        <Stack gap="lg">
          <div>
            <Title order={2} ta="center">Create an Account</Title>
            <Text c="dimmed" size="sm" ta="center" mt="sm">
              Enter your information to register
            </Text>
          </div>

          {error && (
            <Alert icon={<IconAlertCircle size="1rem" />} color="red" variant="filled">
              {error}
            </Alert>
          )}

          {success && (
            <Alert icon={<IconCheck size="1rem" />} color="green" variant="filled">
              Registration successful! Please check your email to verify your account.{' '}
              <Text component="span" c="white" style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => navigate('/login')}>
                Log in here
              </Text>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <Grid gutter="md">
                <Grid.Col span={6}>
                  <TextInput
                    required
                    label="First Name"
                    value={formData.firstName}
                    onChange={(event) => handleChange('firstName', event.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    required
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(event) => handleChange('lastName', event.currentTarget.value)}
                  />
                </Grid.Col>
              </Grid>

              <TextInput
                required
                label="Email"
                type="email"
                value={formData.user_email}
                onChange={(event) => handleChange('user_email', event.currentTarget.value)}
              />

              <Grid gutter="md">
                <Grid.Col span={6}>
                  <PasswordInput
                    required
                    label="Password"
                    value={formData.password}
                    onChange={(event) => handleChange('password', event.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <PasswordInput
                    required
                    label="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={(event) => handleChange('confirmPassword', event.currentTarget.value)}
                  />
                </Grid.Col>
              </Grid>

              <TextInput
                label="Phone Number"
                value={formData.phone_number}
                onChange={(event) => handleChange('phone_number', event.currentTarget.value)}
              />

              <TextInput
                label="Address"
                value={formData.address}
                onChange={(event) => handleChange('address', event.currentTarget.value)}
              />

              <Select
                label="Role"
                placeholder="Select role"
                value={formData.role}
                onChange={(value) => handleChange('role', value || 'user')}
                data={[ 'user','admin', 'staff','student']}
              />

              <FileInput
                label="Profile Picture"
                placeholder="Choose file"
                leftSection={<IconUpload size="1rem" />}
                accept="image/*"
                value={avatar}
                onChange={(file: File | null) => setAvatar(file)}
              />

              <Button
                  fullWidth
                  size="md"
                  type="submit"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  mt="md"
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
};

export default Register;

