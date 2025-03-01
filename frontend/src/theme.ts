import { MantineTheme } from '@mantine/core';

interface CustomMantineTheme extends Partial<MantineTheme> {
  colorScheme: 'light' | 'dark';
  globalStyles: (theme: CustomMantineTheme) => {
    body: {
      backgroundColor: string;
    };
  };
}

export const theme: CustomMantineTheme = {
  colorScheme: 'light',
  primaryColor: 'blue',
  globalStyles: (theme) => ({
    body: {
      backgroundColor: theme.colors?.gray[0] ?? '#ffffff',
    },
  }),
};