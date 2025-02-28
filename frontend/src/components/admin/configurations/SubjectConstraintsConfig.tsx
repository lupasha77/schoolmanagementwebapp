import React, { useState } from 'react';
import { 
  Paper, 
  Title, 
  Group,  
  Button, 
  Divider,
  Box,
  Text,
  JsonInput,
  Alert,
  Accordion, 
} from '@mantine/core';
import { IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { updateConfigSection } from '../../../utils/api/timetableConfigApis';
import { showNotification } from '@mantine/notifications';
import { SubjectConstraintsConfigProps, Config } from './types_config';
 
const SubjectConstraintsConfig: React.FC<SubjectConstraintsConfigProps> = ({ config, onConfigUpdate }) => {
  const [subjectConstraints, setSubjectConstraints] = useState(
    config.SUBJECT_CONSTRAINTS || {}
  );
  const [practicalPeriodsByForm, setPracticalPeriodsByForm] = useState(
    config.PRACTICAL_PERIODS_BY_FORM || {}
  );
  const [sciencePeriods, setSciencePeriods] = useState(
    config.SCIENCE_PERIODS || {}
  );
  const [editingConstraints, setEditingConstraints] = useState(false);
  const [constraintsJson, setConstraintsJson] = useState(
    JSON.stringify(subjectConstraints, null, 2)
  );
  const [editingPracticalPeriods, setEditingPracticalPeriods] = useState(false);
  const [practicalPeriodsJson, setPracticalPeriodsJson] = useState(
    JSON.stringify(practicalPeriodsByForm, null, 2)
  );
  const [editingSciencePeriods, setEditingSciencePeriods] = useState(false);
  const [sciencePeriodsJson, setSciencePeriodsJson] = useState(
    JSON.stringify(sciencePeriods, null, 2)
  );
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Parse JSON data if in editing mode
      let parsedConstraints = subjectConstraints;
      let parsedPracticalPeriods = practicalPeriodsByForm;
      let parsedSciencePeriods = sciencePeriods;
      
      if (editingConstraints) {
        try {
          parsedConstraints = JSON.parse(constraintsJson);
        } catch  {
          showNotification({
            title: 'Invalid JSON',
            message: 'Please check your subject constraints JSON format',
            color: 'red'
          });
          return;
        }
      }
      
      if (editingPracticalPeriods) {
        try {
          parsedPracticalPeriods = JSON.parse(practicalPeriodsJson);
        } catch   {
          showNotification({
            title: 'Invalid JSON',
            message: 'Please check your practical periods JSON format',
            color: 'red'
          });
          return;
        }
      }
      
      if (editingSciencePeriods) {
        try {
          parsedSciencePeriods = JSON.parse(sciencePeriodsJson);
        } catch   {
          showNotification({
            title: 'Invalid JSON',
            message: 'Please check your science periods JSON format',
            color: 'red'
          });
          return;
        }
      }
      
      // Update configurations
      await updateConfigSection('SUBJECT_CONSTRAINTS', parsedConstraints);
      await updateConfigSection('PRACTICAL_PERIODS_BY_FORM', parsedPracticalPeriods);
      await updateConfigSection('SCIENCE_PERIODS', parsedSciencePeriods);
      
      // Create a partial config with only the updated properties
      const updatedProps = {
        SUBJECT_CONSTRAINTS: parsedConstraints,
        PRACTICAL_PERIODS_BY_FORM: parsedPracticalPeriods,
        SCIENCE_PERIODS: parsedSciencePeriods
      };
      
      // Update the full config in parent component
      onConfigUpdate({
        ...config,
        ...updatedProps
      } as Config);
      
      showNotification({
        title: 'Success',
        message: 'Subject constraints settings saved successfully',
        color: 'green'
      });
      
      // Reset editing states
      if (editingConstraints) {
        setSubjectConstraints(parsedConstraints);
        setEditingConstraints(false);
      }
      
      if (editingPracticalPeriods) {
        setPracticalPeriodsByForm(parsedPracticalPeriods);
        setEditingPracticalPeriods(false);
      }
      
      if (editingSciencePeriods) {
        setSciencePeriods(parsedSciencePeriods);
        setEditingSciencePeriods(false);
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to save settings',
        color: 'red'
      });
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Title order={3} mb="md">Subject Constraints Configuration</Title>
      
      <Accordion defaultValue="general">
        <Accordion.Item value="general">
          <Accordion.Control>
            <Title order={4}>General Subject Constraints</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Box mb="md">
              <Group justify="space-between" mb="xs">
                <Text fw={500}>Subject Scheduling Constraints</Text>
                <Button 
                  variant="subtle"  
                  onClick={() => {
                    setEditingConstraints(!editingConstraints);
                    if (!editingConstraints) {
                      setConstraintsJson(JSON.stringify(subjectConstraints, null, 2));
                    }
                  }}
                >
                  {editingConstraints ? 'Simple View' : 'Advanced Edit'}
                </Button>
              </Group>
              
              {editingConstraints ? (
                <JsonInput
                  label="Subject Constraints JSON"
                  placeholder="Enter subject constraints configuration"
                  validationError="Invalid JSON"
                  formatOnBlur
                  autosize
                  minRows={6}
                  value={constraintsJson}
                  onChange={setConstraintsJson}
                />
              ) : (
                <Alert 
                  icon={<IconAlertCircle size={16} />}
                  color="blue" 
                  mb="md"
                >
                  <Title order={5} mb="xs">Current Subject Constraints:</Title>
                  {Object.keys(subjectConstraints).length > 0 ? (
                    <ul>
                      {Object.entries(subjectConstraints).map(([key, value]) => (
                        <li key={key}>
                          <strong>{key.replace(/_/g, ' ')}:</strong> {String(value)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text>No subject constraints configured yet.</Text>
                  )}
                  <Text size="sm" mt="xs">
                    Use Advanced Edit to modify these constraints or add new ones.
                  </Text>
                </Alert>
              )}
            </Box>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="practical">
          <Accordion.Control>
            <Title order={4}>Practical Periods by Form</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Box mb="md">
              <Group justify="space-between" mb="xs">
                <Text fw={500}>Practical Periods Configuration</Text>
                <Button 
                  variant="subtle"  
                  onClick={() => {
                    setEditingPracticalPeriods(!editingPracticalPeriods);
                    if (!editingPracticalPeriods) {
                      setPracticalPeriodsJson(JSON.stringify(practicalPeriodsByForm, null, 2));
                    }
                  }}
                >
                  {editingPracticalPeriods ? 'Simple View' : 'Advanced Edit'}
                </Button>
              </Group>
              
              {editingPracticalPeriods ? (
                <JsonInput
                  label="Practical Periods JSON"
                  placeholder="Enter practical periods configuration"
                  validationError="Invalid JSON"
                  formatOnBlur
                  autosize
                  minRows={8}
                  value={practicalPeriodsJson}
                  onChange={setPracticalPeriodsJson}
                />
              ) : (
                <Alert 
                  icon={<IconAlertCircle size={16} />}
                  color="blue" 
                  mb="md"
                >
                  <Title order={5} mb="xs">Practical Periods by Form Level:</Title>
                  {Object.keys(practicalPeriodsByForm).length > 0 ? (
                    <ul>
                      {Object.entries(practicalPeriodsByForm).map(([form, periods]) => (
                        <li key={form}>
                          <strong>{form}:</strong> {Array.isArray(periods) ? periods.join(', ') : String(periods)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text>No practical periods by form configured yet.</Text>
                  )}
                  <Text size="sm" mt="xs">
                    Use Advanced Edit to modify these configurations.
                  </Text>
                </Alert>
              )}
            </Box>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="science">
          <Accordion.Control>
            <Title order={4}>Science Periods by Form</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Box mb="md">
              <Group justify="space-between" mb="xs">
                <Text fw={500}>Science Periods Configuration</Text>
                <Button 
                  variant="subtle"  
                  onClick={() => {
                    setEditingSciencePeriods(!editingSciencePeriods);
                    if (!editingSciencePeriods) {
                      setSciencePeriodsJson(JSON.stringify(sciencePeriods, null, 2));
                    }
                  }}
                >
                  {editingSciencePeriods ? 'Simple View' : 'Advanced Edit'}
                </Button>
              </Group>
              
              {editingSciencePeriods ? (
                <JsonInput
                  label="Science Periods JSON"
                  placeholder="Enter science periods configuration"
                  validationError="Invalid JSON"
                  formatOnBlur
                  autosize
                  minRows={8}
                  value={sciencePeriodsJson}
                  onChange={setSciencePeriodsJson}
                />
              ) : (
                <Alert 
                  icon={<IconAlertCircle size={16} />}
                  color="blue" 
                  mb="md"
                >
                  <Title order={5} mb="xs">Science Periods by Form Level:</Title>
                  {Object.keys(sciencePeriods).length > 0 ? (
                    <ul>
                      {Object.entries(sciencePeriods).map(([form, periodPairs]) => (
                        <li key={form}>
                          <strong>{form}:</strong> {
                            Array.isArray(periodPairs) 
                              ? JSON.stringify(periodPairs)
                              : String(periodPairs)
                          }
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text>No science periods configured yet.</Text>
                  )}
                  <Text size="sm" mt="xs">
                    Each entry shows pairs of consecutive periods reserved for science lessons.
                    Use Advanced Edit to modify these configurations.
                  </Text>
                </Alert>
              )}
            </Box>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      
      <Divider my="lg" />
      
      <Group justify="space-between">
        <Button 
          leftSection={<IconRefresh size={16} />}
          variant="outline"
          onClick={() => {
            setSubjectConstraints(config.SUBJECT_CONSTRAINTS || {});
            setPracticalPeriodsByForm(config.PRACTICAL_PERIODS_BY_FORM || {});
            setSciencePeriods(config.SCIENCE_PERIODS || {});
            setEditingConstraints(false);
            setEditingPracticalPeriods(false);
            setEditingSciencePeriods(false);
          }}
        >
          Reset Changes
        </Button>
        <Button 
          onClick={handleSave}
          loading={saving}
        >
          Save Settings
        </Button>
      </Group>
    </Paper>
  );
};

export default SubjectConstraintsConfig;