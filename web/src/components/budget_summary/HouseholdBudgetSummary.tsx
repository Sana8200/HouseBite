import { useEffect, useState } from 'react';
import { Paper, Title, Text, Stack, Group, Progress, Table, Badge, SimpleGrid, Box, Tooltip } from '@mantine/core';
import { supabase } from '../../supabase';

interface MemberSpending {
  member_id: string;
  member_name: string;
  amount_spent: number;
  receipt_count: number;
  percentage_of_total: number;
  color_index: number;
}

interface UserSpending {
  month: string;
  amount_spent: number;
  receipt_count: number;
  household_total_spent: number;
  percentage_of_household: number;
  household_monthly_budget: number | null;
  budget_used_percentage: number | null;
}

interface HouseholdBudgetSummaryProps {
  householdId: string;
  userId?: string;
}

// Color palette for different members
const MEMBER_COLORS = [
  '#228be6', // blue
  '#40c057', // green
  '#fab005', // yellow
  '#fd7e14', // orange
  '#e64980', // pink
  '#be4bdb', // purple
  '#f03e3e', // red
  '#12b886', // teal
  '#5c7cfa', // indigo
  '#20c997', // mint
];

const getBadgeColor = (percentage: number): string => {
  if (percentage < 50) return 'green';
  if (percentage < 75) return 'orange';
  if (percentage < 90) return 'orange.7';
  return 'red';
};

const getProgressColor = (percentage: number): string => {
  if (percentage < 50) return 'green';
  if (percentage < 75) return 'orange';
  if (percentage < 90) return 'orange.7';
  return 'red';
};

export function HouseholdBudgetSummary({ householdId, userId }: HouseholdBudgetSummaryProps) {
  const [memberSpending, setMemberSpending] = useState<MemberSpending[]>([]);
  const [userData, setUserData] = useState<UserSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [householdName, setHouseholdName] = useState('');
  const [householdBudget, setHouseholdBudget] = useState<number | null>(null);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    void fetchAllData();
  }, [householdId, userId]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchHouseholdInfo(),
      fetchMemberSpending(),
      fetchUserSpending(),
    ]);
    setLoading(false);
  };

  const fetchHouseholdInfo = async () => {
    const { data } = await supabase
      .from('household')
      .select('house_name, monthly_budget')
      .eq('id', householdId)
      .single();
    
    if (data) {
      setHouseholdName(data.house_name);
      setHouseholdBudget(data.monthly_budget);
    }
  };

  const fetchMemberSpending = async () => {
    const { data, error } = await supabase
      .rpc('get_household_member_spending', {
        p_household_id: householdId,
        p_month: new Date().toISOString().split('T')[0]
      });

    if (!error && data) {
      setMemberSpending(data);
    }
  };

  const fetchUserSpending = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .rpc('get_user_household_monthly_spending', {
        p_household_id: householdId,
        p_user_id: userId
      });
    
    if (!error && data) setUserData(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatMonth = (monthDate: string) => {
    const date = new Date(monthDate);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const totalSpent = memberSpending.reduce((sum, m) => sum + m.amount_spent, 0);
  const budgetUsed = householdBudget ? (totalSpent / householdBudget) * 100 : 0;
  const remainingBudget = householdBudget ? householdBudget - totalSpent : 0;

  // Calculate progress bar segments
  const getProgressSegments = () => {
    if (!householdBudget) return [];
    
    const segments = [];
    let currentOffset = 0;
    
    // Sort members by amount spent (already sorted from DB)
    for (let i = 0; i < memberSpending.length; i++) {
      const member = memberSpending[i];
      const width = (member.amount_spent / householdBudget) * 100;
      
      // Determine if this member is hovered
      const isHovered = hoveredMember === member.member_id;
      
      segments.push({
        value: width,
        color: isHovered ? MEMBER_COLORS[member.color_index % MEMBER_COLORS.length] : MEMBER_COLORS[member.color_index % MEMBER_COLORS.length],
        label: member.member_name,
        amount: member.amount_spent,
        offset: currentOffset,
        tooltip: `${member.member_name}: ${formatCurrency(member.amount_spent)} (${member.percentage_of_total}%)`
      });
      currentOffset += width;
    }
    
    // Add remaining budget segment
    if (remainingBudget > 0) {
      const remainingWidth = (remainingBudget / householdBudget) * 100;
      const isHovered = hoveredMember === 'remaining';
      segments.push({
        value: remainingWidth,
        color: isHovered ? '#dee2e6' : '#f1f3f5',
        label: 'Remaining',
        amount: remainingBudget,
        offset: currentOffset,
        tooltip: `Remaining: ${formatCurrency(remainingBudget)}`
      });
    }
    
    return segments;
  };

  const progressSegments = getProgressSegments();

  const currentUserSpending = userData[0];
  const userTotalSpent = currentUserSpending?.amount_spent || 0;
  const userPercentage = currentUserSpending?.percentage_of_household || 0;
  const badgeColor = getBadgeColor(budgetUsed);
  const progressColor = getProgressColor(budgetUsed);

  if (loading) {
    return <Text mt="xl">Loading budget summary...</Text>;
  }

  return (
    <Box mt="xl">
      <Stack gap="lg">
        {/* User-specific spending cards */}
        {currentUserSpending && (
          <Paper withBorder p="md" radius="md">
            <Title order={3} mb="md">Your Monthly Spending</Title>
            
            <Group justify="space-between" mb="md">
              <Text fw={500}>Current Month: {formatMonth(currentUserSpending.month)}</Text>
              <Badge size="lg" color={badgeColor}>
                {budgetUsed.toFixed(1)}% of household budget used
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              <Paper withBorder p="md" bg="blue.0">
                <Text size="sm" c="dimmed">Your Spending</Text>
                <Text size="xl" fw={700}>{formatCurrency(userTotalSpent)}</Text>
                <Text size="xs">{currentUserSpending.receipt_count} receipts</Text>
              </Paper>

              <Paper withBorder p="md" bg="gray.0">
                <Text size="sm" c="dimmed">Household Total</Text>
                <Text size="xl" fw={700}>{formatCurrency(totalSpent)}</Text>
                <Text size="xs">Your share: {userPercentage.toFixed(1)}%</Text>
              </Paper>

              {householdBudget && (
                <Paper withBorder p="md" bg={remainingBudget < 0 ? 'red.0' : 'yellow.0'}>
                  <Text size="sm" c="dimmed">Remaining Budget</Text>
                  <Text size="xl" fw={700} c={remainingBudget < 0 ? 'red' : 'dark'}>
                    {formatCurrency(Math.max(0, remainingBudget))}
                  </Text>
                  <Text size="xs">of {formatCurrency(householdBudget)} total</Text>
                </Paper>
              )}
            </SimpleGrid>
          </Paper>
        )}

        {/* Household budget breakdown */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="md">
            <Title order={3}>Household Budget: {householdName}</Title>
            <Badge size="lg" color={badgeColor}>
              {budgetUsed.toFixed(1)}% used this month
            </Badge>
          </Group>

          {/* Interactive Progress Bar */}
          <Box mb="lg">
            <Text size="sm" fw={500} mb="xs">Spending Breakdown by Member</Text>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Progress.Root size="xl">
                {progressSegments.map((segment, idx) => (
                  <Tooltip key={idx} label={segment.tooltip} withArrow>
                    <Progress.Section
                      value={segment.value}
                      color={segment.color}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        opacity: hoveredMember && hoveredMember !== segment.label.toLowerCase() && hoveredMember !== 'remaining' ? 0.7 : 1
                      }}
                      onMouseEnter={() => setHoveredMember(
                        segment.label === 'Remaining' ? 'remaining' : 
                        memberSpending.find(m => m.member_name === segment.label)?.member_id || null
                      )}
                      onMouseLeave={() => setHoveredMember(null)}
                    />
                  </Tooltip>
                ))}
              </Progress.Root>
            </div>
            
            {/* Legend */}
            <Group gap="md" mt="xs">
              {memberSpending.map((member, idx) => (
                <Group 
                  key={member.member_id} 
                  gap="xs" 
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredMember(member.member_id)}
                  onMouseLeave={() => setHoveredMember(null)}
                >
                  <div style={{ 
                    width: 12, 
                    height: 12, 
                    backgroundColor: MEMBER_COLORS[member.color_index % MEMBER_COLORS.length],
                    borderRadius: 2 
                  }} />
                  <Text size="xs">{member.member_name}</Text>
                  <Text size="xs" fw={500}>{formatCurrency(member.amount_spent)}</Text>
                </Group>
              ))}
              {remainingBudget > 0 && (
                <Group 
                  gap="xs" 
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredMember('remaining')}
                  onMouseLeave={() => setHoveredMember(null)}
                >
                  <div style={{ width: 12, height: 12, backgroundColor: '#f1f3f5', borderRadius: 2 }} />
                  <Text size="xs">Remaining</Text>
                  <Text size="xs" fw={500}>{formatCurrency(remainingBudget)}</Text>
                </Group>
              )}
            </Group>
          </Box>

          {/* Spending by Member Table */}
          <Title order={4} mb="md">Spending by Member</Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Member</Table.Th>
                <Table.Th>This Month</Table.Th>
                <Table.Th>Receipts</Table.Th>
                <Table.Th>% of Total</Table.Th>
                <Table.Th>Visual</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {memberSpending.map((member) => (
                <Table.Tr 
                  key={member.member_id}
                  onMouseEnter={() => setHoveredMember(member.member_id)}
                  onMouseLeave={() => setHoveredMember(null)}
                  style={{ cursor: 'pointer', backgroundColor: hoveredMember === member.member_id ? '#f8f9fa' : 'transparent' }}
                >
                  <Table.Td>
                    <Group gap="xs">
                      <div style={{ 
                        width: 10, 
                        height: 10, 
                        backgroundColor: MEMBER_COLORS[member.color_index % MEMBER_COLORS.length],
                        borderRadius: 2 
                      }} />
                      <Text fw={member.member_id === userId ? 700 : 400}>
                        {member.member_name} {member.member_id === userId ? '(You)' : ''}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>{formatCurrency(member.amount_spent)}</Table.Td>
                  <Table.Td>{member.receipt_count}</Table.Td>
                  <Table.Td>{member.percentage_of_total.toFixed(1)}%</Table.Td>
                  <Table.Td>
                    <Progress.Root size="sm" style={{ width: 100 }}>
                      <Progress.Section 
                        value={member.percentage_of_total} 
                        color={MEMBER_COLORS[member.color_index % MEMBER_COLORS.length]} 
                      />
                    </Progress.Root>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {householdBudget && budgetUsed > 100 && (
            <Text c="red" size="sm" mt="md">
              Warning: You have exceeded your monthly budget by {formatCurrency(totalSpent - householdBudget)}!
            </Text>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}