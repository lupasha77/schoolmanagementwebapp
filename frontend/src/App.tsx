import React from 'react';
import { MantineProvider,ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css'; 
import './styles/global.css';
// import { theme } from './theme';
import AppRoutes from './AppRoutes';
import '@mantine/notifications/styles.layer.css';
// import { ModalsProvider } from '@mantine/modals';
const App: React.FC = () => {
  return (
    <MantineProvider     >
    {/* < ModalsProvider> */}
      {/* //theme={theme} */}
      <ColorSchemeScript defaultColorScheme="light" />
      <Notifications position="top-right" />
      <AppRoutes />   
      {/* </ModalsProvider> */}
    </MantineProvider>
  );
}

export default App;