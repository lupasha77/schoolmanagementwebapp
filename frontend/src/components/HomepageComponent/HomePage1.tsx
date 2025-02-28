import { IconCookie, IconGauge, IconUser } from '@tabler/icons-react';
import {
  Badge,
  Card,
  Container,
  Group,
  SimpleGrid,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import classes from './HomePage1.module.css';

const mockdata = [
  {
    title: 'World Class Standard Curricula',
    description:
      'World class curricula are the best way to learn. They are the best way to learn. They are the best way to learn.',
    icon: IconGauge,
  },
  {
    title: 'Extra-Curricular Activities',
    description:
      'Wide exposure to extracurricular activities are very important for students. They are very important for students.',
    icon: IconUser,
  },
  {
    title: 'No third parties',
    description:
      'They’re popular, but they’re rare. Trainers who show them off recklessly may be targeted by thieves',
    icon: IconCookie,
  },
];

export function HomePage1() {
  const theme = useMantineTheme();
  const features = mockdata.map((feature) => (
    <Card key={feature.title} shadow="md" radius="md" className={classes.card} padding="xl">
      <feature.icon size={50} stroke={2} color={theme.colors.blue[6]} />
      <Text fz="lg" fw={500} className={classes.cardTitle} mt="md">
        {feature.title}
      </Text>
      <Text fz="sm" c="dimmed" mt="sm">
        {feature.description}
      </Text>
    </Card>
  ));

  return (
    <Container size="lg" py="xl">
      <Group justify="center">
        <Badge variant="filled" size="lg">
          We thrive in Excellence
        </Badge>
      </Group>

      <Title order={2} className={classes.title} ta="center" mt="sm">
        Integrate effortlessly with any education technology stack
      </Title>

      <Text c="dimmed" className={classes.description} ta="center" mt="md">
        Our role is to transform you the learner from a position of zero knowledge to a position of
        mastery and ready for the real world, whether in the academic or professional setting.
      </Text>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mt={50}>
        {features}
      </SimpleGrid>
    </Container>
  );
}