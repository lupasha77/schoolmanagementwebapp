import { MultiSelect as MantineMultiSelect, MultiSelectProps, Text, Box } from '@mantine/core';

// Create a wrapper component for MultiSelect to debug data issues
const SafeMultiSelect = ({ data, ...props }: MultiSelectProps) => {
  // Check if data is an array
  const isArray = Array.isArray(data);
  
  // Create a safe version of the data
  const safeData = isArray ? data : [];
  
  // If empty, provide a placeholder option
  const finalData = safeData.length > 0 
    ? safeData 
    : [{ value: 'placeholder', label: 'No options available', disabled: true }];
  
  // Debug information - can be removed in production
  console.log('MultiSelect data:', {
    isArray,
    originalLength: isArray ? data.length : 'Not an array',
    safeDataLength: safeData.length,
    finalDataLength: finalData.length,
    sampleItems: finalData.slice(0, 3)
  });
  
  // If there's an issue with the data, render error info
  if (!isArray) {
    console.error('MultiSelect received non-array data:', data);
    return (
      <Box mb={10}>
        <Text color="red" size="sm" mb={5}>Error: MultiSelect data must be an array</Text>
        <MantineMultiSelect
          {...props}
          data={finalData}
          disabled
        />
      </Box>
    );
  }
  
  // Make sure each item in finalData has the required properties
  const validatedData = finalData.map(item => {
    // If item is null or undefined, provide a default item
    if (!item) {
      return { value: 'invalid-item', label: 'Invalid item', disabled: true };
    }
    
    // Make sure value and label exist and are strings
    if (typeof item === 'string') {
      return { value: item, label: item, disabled: false };
    }
    return {
      value: 'value' in item ? String(item.value) : 'missing-value',
      label: 'label' in item ? String(item.label) : 'Unnamed Option',
      disabled: 'disabled' in item ? item.disabled : false,
      group: 'group' in item ? item.group : undefined
    };
  });
  
  // Render the MultiSelect with safe data
  return <MantineMultiSelect {...props} data={validatedData} />;
};

export default SafeMultiSelect;