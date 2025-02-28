import { MantineThemeOverride } from '@mantine/core';

export const theme: MantineThemeOverride = {
  colorScheme: 'light',
  primaryColor: 'blue',
  globalStyles: (theme) => ({
    body: {
      backgroundColor: theme.colors.gray[0],
    },
  }),
};