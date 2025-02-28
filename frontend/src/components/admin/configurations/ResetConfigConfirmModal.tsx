import React, { useState } from 'react';
import { 
  //  Modal, 
  Button, 
  Group, 
  Text, 
  Stack,
  Checkbox,
  Alert,
  LoadingOverlay
} from '@mantine/core';  
import { IconAlertTriangle, IconRotateClockwise } from '@tabler/icons-react'; 
import { showNotification } from '@mantine/notifications';

// Define the TimetableConfig type
type TimetableConfig = object;

 
export interface ResetConfigConfirmModalProps   {
    opened: boolean;
    onClose: () => void;
    onConfigReset: (newConfig: TimetableConfig) => void;
  };
 
const ResetConfigConfirmModal: React.FC<ResetConfigConfirmModalProps> = ({ 
    
  onClose, 
  onConfigReset 
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [loading, setLoading] = useState(false);
   
  const handleClose = () => {
    setConfirmReset(false);
    onClose();
  };

  const handleReset = async () => {
    if (!confirmReset) return;

    setLoading(true);
    try {
    //   await resetTimetableConfig();
      
      showNotification({
        title: 'Success',
        message: 'Timetable configuration has been reset to defaults',
        color: 'green',
      });
      
      onConfigReset({});
      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      showNotification({
        title: 'Error',
        message: `Failed to reset configuration: ${errorMessage}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {/* // <Modal */}
    {/* //    opened={opened}
    //   onClose={handleClose}
    //   title="Reset Configuration"
    //   size="md"
    //   centered */}
    {/* // > */}
      <LoadingOverlay visible={loading}   />
      
      <Stack  gap="md">
        <Alert
          icon={<IconAlertTriangle size={20} />}
          title="Warning"
          color="red"
          variant="filled"
        >
          This action will reset all timetable configuration settings to their default values.
          This cannot be undone.
        </Alert>
        
        <Text size="sm">
          Resetting the configuration will:
        </Text>
        
        <Stack gap="xs" ml="md">
          <Text size="sm">• Remove all custom constants</Text>
          <Text size="sm">• Reset scheduling parameters</Text>
          <Text size="sm">• Clear any custom rules and constraints</Text>
          <Text size="sm">• Restore default time slots and periods</Text>
        </Stack>
        
        <Text size="sm" mt="md">
          Any existing timetables created with the current configuration will remain unchanged,
          but new timetables will use the default configuration.
        </Text>
        
        <Checkbox
          mt="md"
          checked={confirmReset}
          onChange={(event) => setConfirmReset(event.currentTarget.checked)}
          label="I understand that this action cannot be undone"
          required
        />
        
        <Group justify='space-between' mt="lg">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            color="red"
            leftSection={<IconRotateClockwise size={16} />}
            onClick={handleReset}
            disabled={!confirmReset}
          >
            Reset Configuration
          </Button>
        </Group>
      </Stack>
    {/* // </Modal> */}
    </>
  );
};

export default ResetConfigConfirmModal;