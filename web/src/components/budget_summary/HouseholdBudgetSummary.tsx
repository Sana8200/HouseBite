import { useEffect, useState } from 'react';
import { Paper, Title, Text, Stack, Group, Progress, Table, Badge, SimpleGrid, Box, Tooltip } from '@mantine/core';
import { supabase } from '../../supabase';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

interface MemberSpending {
  member_id: string;
  member_name: string;
  amount_spent: number;
  receipt_count: number;
  percentage_of_total: number;
  color_index: number;
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

export function HouseholdBudgetSummary({ householdId, userId }: HouseholdBudgetSummaryProps) {
  const [memberSpending, setMemberSpending] = useState<MemberSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [householdBudget, setHouseholdBudget] = useState<number | null>(null);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  useEffect(() => {
    if (householdId) {
      void fetchAllData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, userId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchHouseholdInfo(),
        fetchMemberSpending(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHouseholdInfo = async () => {
    const { data, error } = await supabase
      .from('household')
      .select('house_name, monthly_budget')
      .eq('id', householdId)
      .single();
    
    if (error) {
      console.error('Error fetching household info:', error);
      return;
    }
    
    if (data) {
      setHouseholdBudget(data.monthly_budget as number | null);
    }
  };

  const fetchMemberSpending = async () => {
    console.log('Fetching member spending for household:', householdId);
    
    const { data, error } = await supabase
      .rpc('get_household_member_spending', {
        p_household_id: householdId
        // Don't pass p_month - let it default to current month
      }) as PostgrestSingleResponse<MemberSpending[]>;

    console.log('Member spending response:', { data, error });

    if (error) {
      console.error('Error fetching member spending:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Setting member spending:', data);
      setMemberSpending(data);
    } else {
      console.log('No member spending data received');
      setMemberSpending([]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SEK'
    }).format(amount);
  };

  const formatMonth = (monthDate: string) => {
    const date = new Date(monthDate);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Calculate totals from memberSpending (not userData)
  const totalSpent = memberSpending.reduce((sum, m) => sum + m.amount_spent, 0);
  const budgetUsed = householdBudget ? (totalSpent / householdBudget) * 100 : 0;
  const remainingBudget = householdBudget ? householdBudget - totalSpent : 0;

  // Get current user's spending from memberSpending array
  const currentUserSpending = memberSpending.find(m => m.member_id === userId);
  const userTotalSpent = currentUserSpending?.amount_spent || 0;

  // Calculate progress bar segments
  const getProgressSegments = () => {
    if (!householdBudget || memberSpending.length === 0) return [];
    
    const segments = [];
    // let currentOffset = 0;
    
    for (let i = 0; i < memberSpending.length; i++) {
      const member = memberSpending[i];
      const width = (member.amount_spent / householdBudget) * 100;
      const isHovered = hoveredMember === member.member_id;
      
      segments.push({
        value: width,
        color: isHovered ? MEMBER_COLORS[member.color_index % MEMBER_COLORS.length] : MEMBER_COLORS[member.color_index % MEMBER_COLORS.length],
        label: member.member_name,
        amount: member.amount_spent,
        tooltip: `${member.member_name}: ${formatCurrency(member.amount_spent)} (${member.percentage_of_total}%)`
      });
      // currentOffset += width;
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
        tooltip: `Remaining: ${formatCurrency(remainingBudget)}`
      });
    }
    
    return segments;
  };

  const progressSegments = getProgressSegments();
  const badgeColor = getBadgeColor(budgetUsed);

  if (loading) {
    return (
      <Box mt="xl">
        <Paper withBorder p="md" radius="md">
          <Text ta="center">Loading budget summary...</Text>
        </Paper>
      </Box>
    );
  }

  return (
    <Box mt="xl">
      <Stack gap="lg">
        {/* User-specific spending cards */}
        <Paper withBorder p="md" radius="md">
          <Title order={3} mb="md">Household monthly spending</Title>   

          <Box mt="md">
          <Group justify="space-between" mb="md">
            <Text fw={500}>Current month: {formatMonth(new Date().toISOString())}</Text>
            <Badge size="lg" color={badgeColor}>
              {budgetUsed.toFixed(1)}% used this month
            </Badge>
          </Group>
          </Box>  

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <Paper withBorder p="md" bg="blue.0">
              <Text size="sm" c="dimmed">Your spending</Text>
              <Text size="xl" fw={700}>{formatCurrency(userTotalSpent)}</Text>
              <Text size="xs">{currentUserSpending?.receipt_count || 0} receipts</Text>
            </Paper>

            <Paper withBorder p="md" bg="gray.0">
              <Text size="sm" c="dimmed">Household total spending</Text>
              <Text size="xl" fw={700}>{formatCurrency(totalSpent)}</Text>
              {/*<Text size="xs">Your share: {userPercentage.toFixed(1)}%</Text> might not need, is redundant*/}
            </Paper>

            {householdBudget && (
              <Paper withBorder p="md" bg={remainingBudget < 0 ? 'red.0' : 'yellow.0'}>
                <Text size="sm" c="dimmed">Remaining budget</Text>
                <Text size="xl" fw={700} c={remainingBudget < 0 ? 'red' : 'dark'}>
                  {formatCurrency(Math.max(0, remainingBudget))}
                </Text>
                <Text size="xs">of {formatCurrency(householdBudget)} total</Text>
              </Paper>
            )}
          </SimpleGrid>

          {/* Interactive Progress Bar */}
          {memberSpending.length > 0 && householdBudget && (
            <Box mt="md">
              <Title order={4} mb="md">Spending breakdown</Title>
              <Progress.Root size="xl">
                {progressSegments.map((segment, idx) => (
                  <Tooltip key={idx} label={segment.tooltip} withArrow>
                    <Progress.Section
                      value={segment.value}
                      color={segment.color}
                      style={{ cursor: 'pointer' }}
                    />
                  </Tooltip>
                ))}
              </Progress.Root>
              
              {/* Legend */}
              <Group gap="md" mt="xs">
                {memberSpending.map((member) => (
                  <Group key={member.member_id} gap="xs">
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
                  <Group gap="xs">
                    <div style={{ width: 12, height: 12, backgroundColor: '#f1f3f5', borderRadius: 2 }} />
                    <Text size="xs">Remaining</Text>
                    <Text size="xs" fw={500}>{formatCurrency(remainingBudget)}</Text>
                  </Group>
                )}
              </Group>
            </Box>
          )}

          {/* Spending by Member Table */}
          <Box mt="lg">          
          {memberSpending.length > 0 ? (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Member</Table.Th>
                  <Table.Th>This month</Table.Th>
                  <Table.Th>Number of receipts</Table.Th>
                  <Table.Th>% of total spending of the household</Table.Th>
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
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed" ta="center" py="md">No spending data for this month.</Text>
          )}
          </Box>

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
