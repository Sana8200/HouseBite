import { useEffect, useState } from 'react';
import { Paper, Title, Text, Stack, Group, Progress, Table, Badge } from '@mantine/core';
import { supabase } from '../../supabase';

interface BudgetSummary {
  month: string;
  buyer_id: string;
  member_monthly_spent: number;
  member_receipt_count: number;
  household_total_spent: number;
  household_monthly_budget: number | null;
  budget_used_percentage: number | null;
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
  userId?: string; // Optional: if provided, shows user-specific view
}

export function HouseholdBudgetSummary({ householdId, userId }: HouseholdBudgetSummaryProps) {
  const [budgetData, setBudgetData] = useState<BudgetSummary[]>([]);
  const [userData, setUserData] = useState<UserSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [householdName, setHouseholdName] = useState('');

  useEffect(() => {
    void fetchBudgetSummary();
    void fetchHouseholdInfo();
  }, [householdId, userId]);

  const fetchHouseholdInfo = async () => {
    const { data } = await supabase
      .from('household')
      .select('house_name')
      .eq('id', householdId)
      .single();
    
    if (data) setHouseholdName(data.house_name);
  };

  const fetchBudgetSummary = async () => {
    setLoading(true);
    
    if (userId) {
      // Get user-specific spending
      const { data, error } = await supabase
        .rpc('get_user_household_monthly_spending', {
          p_household_id: householdId,
          p_user_id: userId
        });
      
      if (!error && data) setUserData(data);
    } else {
      // Get full household budget summary
      const { data, error } = await supabase
        .from('household_monthly_budget_summary')
        .select('*')
        .eq('household_id', householdId)
        .order('month', { ascending: false });
      
      if (!error && data) setBudgetData(data);
    }
    
    setLoading(false);
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

  if (loading) {
    return <Text>Loading budget summary...</Text>;
  }

  // User-specific view
  if (userId && userData.length > 0) {
    const currentMonth = userData[0];
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <Title order={3}>Your Monthly Spending</Title>
          
          {currentMonth && (
            <>
              <Group justify="space-between">
                <Text fw={500}>Current Month: {formatMonth(currentMonth.month)}</Text>
                <Badge size="lg" color={currentMonth.budget_used_percentage && currentMonth.budget_used_percentage > 80 ? 'red' : 'green'}>
                  {currentMonth.budget_used_percentage?.toFixed(1)}% of budget used
                </Badge>
              </Group>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Paper withBorder p="md" bg="blue.0">
                  <Text size="sm" c="dimmed">Your Spending</Text>
                  <Text size="xl" fw={700}>{formatCurrency(currentMonth.amount_spent)}</Text>
                  <Text size="xs">{currentMonth.receipt_count} receipts</Text>
                </Paper>

                <Paper withBorder p="md" bg="gray.0">
                  <Text size="sm" c="dimmed">Household Total</Text>
                  <Text size="xl" fw={700}>{formatCurrency(currentMonth.household_total_spent)}</Text>
                  <Text size="xs">Your share: {currentMonth.percentage_of_household.toFixed(1)}%</Text>
                </Paper>
              </SimpleGrid>

              {currentMonth.household_monthly_budget && (
                <>
                  <Text size="sm" fw={500}>Budget Usage</Text>
                  <Progress 
                    value={currentMonth.budget_used_percentage || 0} 
                    color={currentMonth.budget_used_percentage > 80 ? 'red' : 'blue'}
                    size="lg"
                  />
                  <Group justify="space-between">
                    <Text size="xs">Remaining: {formatCurrency(currentMonth.household_monthly_budget - currentMonth.household_total_spent)}</Text>
                    <Text size="xs">Budget: {formatCurrency(currentMonth.household_monthly_budget)}</Text>
                  </Group>
                </>
              )}
            </>
          )}

          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Month</Table.Th>
                <Table.Th>Your Spending</Table.Th>
                <Table.Th>Household Total</Table.Th>
                <Table.Th>Your Share</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {userData.map((data) => (
                <Table.Tr key={data.month}>
                  <Table.Td>{formatMonth(data.month)}</Table.Td>
                  <Table.Td>{formatCurrency(data.amount_spent)}</Table.Td>
                  <Table.Td>{formatCurrency(data.household_total_spent)}</Table.Td>
                  <Table.Td>{data.percentage_of_household.toFixed(1)}%</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Paper>
    );
  }

  // Household-wide view
  const currentMonthData = budgetData.filter(d => 
    new Date(d.month).getMonth() === new Date().getMonth() &&
    new Date(d.month).getFullYear() === new Date().getFullYear()
  );

  const totalSpent = currentMonthData.reduce((sum, d) => sum + d.member_monthly_spent, 0);
  const budget = currentMonthData[0]?.household_monthly_budget || null;
  const budgetUsed = budget ? (totalSpent / budget) * 100 : 0;

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>Household Budget: {householdName}</Title>
          <Badge size="lg" color={budgetUsed > 80 ? 'red' : 'green'}>
            {budgetUsed.toFixed(1)}% used this month
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <Paper withBorder p="md" bg="green.0">
            <Text size="sm" c="dimmed">Total Spent This Month</Text>
            <Text size="xl" fw={700}>{formatCurrency(totalSpent)}</Text>
          </Paper>

          {budget && (
            <>
              <Paper withBorder p="md" bg="blue.0">
                <Text size="sm" c="dimmed">Monthly Budget</Text>
                <Text size="xl" fw={700}>{formatCurrency(budget)}</Text>
              </Paper>

              <Paper withBorder p="md" bg={budget - totalSpent < 0 ? 'red.0' : 'yellow.0'}>
                <Text size="sm" c="dimmed">Remaining</Text>
                <Text size="xl" fw={700} c={budget - totalSpent < 0 ? 'red' : 'dark'}>
                  {formatCurrency(budget - totalSpent)}
                </Text>
              </Paper>
            </>
          )}
        </SimpleGrid>

        {budget && (
          <>
            <Text size="sm" fw={500}>Budget Usage Progress</Text>
            <Progress value={Math.min(budgetUsed, 100)} color={budgetUsed > 80 ? 'red' : 'blue'} size="lg" />
          </>
        )}

        <Title order={4}>Spending by Member</Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Member</Table.Th>
              <Table.Th>This Month</Table.Th>
              <Table.Th>Receipts</Table.Th>
              <Table.Th>% of Total</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {currentMonthData.map((data) => (
              <Table.Tr key={data.buyer_id}>
                <Table.Td>{data.buyer_id === userId ? 'You' : data.buyer_id}</Table.Td>
                <Table.Td>{formatCurrency(data.member_monthly_spent)}</Table.Td>
                <Table.Td>{data.member_receipt_count}</Table.Td>
                <Table.Td>
                  {totalSpent > 0 ? ((data.member_monthly_spent / totalSpent) * 100).toFixed(1) : 0}%
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
}

// SimpleGrid import
import { SimpleGrid } from '@mantine/core';