import { Burger, Drawer, Paper, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import './HouseholdSwitcher.css';

export interface HouseholdOption {
  id: string;
  house_name: string;
}

interface HouseholdSwitcherProps {
  households: HouseholdOption[];
  selectedHouseholdId: string | null;
  onSelect: (household: HouseholdOption) => void;
}

export function HouseholdSwitcher({
  households,
  selectedHouseholdId,
  onSelect,
}: HouseholdSwitcherProps) {
  const [opened, { open, close }] = useDisclosure(false);

  const handleSelect = (household: HouseholdOption) => {
    onSelect(household);
    close();
  };

  return (
    <div className="household-switcher">
      <Burger
        opened={opened}
        onClick={opened ? close : open}
        aria-label="Open household list"
        className="household-switcher__burger"
      />

      <Drawer
        opened={opened}
        onClose={close}
        position="left"
        title="Your households"
        classNames={{
          content: 'household-switcher__drawer',
          header: 'household-switcher__drawer-header',
          title: 'household-switcher__drawer-title',
          body: 'household-switcher__drawer-body',
        }}
      >
        <Stack gap="sm">
          {households.map((household) => (
            <Paper
              key={household.id}
              component="button"
              type="button"
              className={`household-switcher__item${
                household.id === selectedHouseholdId ? ' is-active' : ''
              }`}
              onClick={() => handleSelect(household)}
              radius="md"
              withBorder
            >
              <Text className="household-switcher__item-name">{household.house_name}</Text>
            </Paper>
          ))}
        </Stack>
      </Drawer>
    </div>
  );
}
