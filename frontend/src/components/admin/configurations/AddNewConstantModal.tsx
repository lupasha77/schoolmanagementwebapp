import  { useState } from 'react';
import { 
  // Modal, 
  TextInput, 
  Button, 
  Group, 
  Box, 
  Select,
  NumberInput,
  Textarea,
  Switch,
  Text,
  Alert
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react'; 
import { showNotification } from '@mantine/notifications';

interface Constant {
    name: string;
    value: string | number | boolean;
  }
  interface AddNewConstantParams {
    name: string;
    type: string;
    value: number | string | boolean;
  }
interface AddNewConstantModalProps {
    opened: boolean;
    onClose: () => void;
    onConstantAdded: (constant: Constant) => void;
  }
const AddNewConstantModal = ({   onClose, onConstantAdded }: AddNewConstantModalProps) => {
  const [constantName, setConstantName] = useState('');
  const [constantType, setConstantType] = useState('string');
  const [stringValue, setStringValue] = useState('');
  const [numberValue, setNumberValue] = useState(0);
  const [booleanValue, setBooleanValue] = useState(false);
  const [jsonValue, setJsonValue] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  const resetForm = () => {
    setConstantName('');
    setConstantType('string');
    setStringValue('');
    setNumberValue(0);
    setBooleanValue(false);
    setJsonValue('{}');
    setNameError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateConstantName = (name: string) => {
    if (!name) {
      setNameError('Constant name is required');
      return false;
    }
    
    if (!/^[A-Z][A-Z_0-9]*$/.test(name)) {
      setNameError('Constant name must be uppercase with underscores (e.g., MAX_VALUE)');
      return false;
    }
    
    setNameError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateConstantName(constantName)) {
      return;
    }
    
    setLoading(true);
    try {
      let value;
      
      switch (constantType) {
        case 'string':
          value = stringValue;
          break;
        case 'number':
          value = numberValue;
          break;
        case 'boolean':
          value = booleanValue;
          break;
        case 'json':
          try {
            value = JSON.parse(jsonValue);
          } catch  {
            showNotification({
              title: 'Invalid JSON',
              message: 'Please enter valid JSON data',
              color: 'red',
            });
            setLoading(false);
            return;
          }
          break;
        default:
          value = stringValue;
      }
      const addNewConstant = async ({ name, type, value }: AddNewConstantParams) => {
        console.log(name, type, value); // Use the destructured properties
  // function implementation here
        return { data:{name, value }};
      };
      const response = await addNewConstant({
        name: constantName,
        type: constantType,
        value: value,
      });
      
      showNotification({
        title: 'Success',
        message: `Constant ${constantName} added successfully`,
        color: 'green',
      });
      
      onConstantAdded(response.data);
      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      showNotification({
        title: 'Error', 
        message: `Failed to add constant: ${errorMessage}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
   
    {/* <Modal
      opened={opened}
      onClose={handleClose}
      title="Add New Configuration Constant"
      size="md"
    > */}
      <Box>
        {nameError && (
          <Alert 
            icon={<IconAlertCircle size={16} />} 
            title="Validation Error" 
            color="red" 
            mb="md"
          >
            {nameError}
          </Alert>
        )}
        
        <TextInput
          required
          label="Constant Name"
          placeholder="MAX_SLOTS_PER_DAY"
          value={constantName}
          onChange={(e) => {
            setConstantName(e.target.value);
            if (e.target.value) validateConstantName(e.target.value);
          }}
          mb="md"
        />
        
        <Select
          label="Constant Type"
          value={constantType} 
          onChange={(value) => setConstantType(value as string)}
          placeholder="Select constant type"
          data={[
            { value: 'string', label: 'String' },
            { value: 'number', label: 'Number' },
            { value: 'boolean', label: 'Boolean' },
            { value: 'json', label: 'JSON' },
          ]}
          mb="md"
        />
        
        {constantType === 'string' && (
          <TextInput
            label="String Value"
            placeholder="Enter string value"
            value={stringValue}
            onChange={(e) => setStringValue(e.target.value)}
            mb="md"
          />
        )}
        
        {constantType === 'number' && (
          <NumberInput
            label="Number Value"
            placeholder="Enter number value"
            value={numberValue} 
            onChange={(value) => setNumberValue(value as number)}
            mb="md"
          />
        )}
        
        {constantType === 'boolean' && (
          <Box mb="md">
            <Text size="sm" fw={500} mb={5}>Boolean Value</Text>
            <Switch
              checked={booleanValue}
              onChange={(e) => setBooleanValue(e.target.checked)}
              label={booleanValue ? "True" : "False"}
            />
          </Box>
        )}
        
        {constantType === 'json' && (
          <Textarea
            label="JSON Value"
            placeholder='{"key": "value"}'
            value={jsonValue}
            onChange={(e) => setJsonValue(e.target.value)}
            minRows={5}
            mb="md"
          />
        )}
        
        <Group justify="space-between" mt="md">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Save Constant
          </Button>
        </Group>
      </Box>
    {/* </Modal> */}
    </>
  );
};

export default AddNewConstantModal;