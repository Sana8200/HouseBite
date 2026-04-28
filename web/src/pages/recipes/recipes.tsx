import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { supabase } from "../../supabase"
import "./recipes.css"
import { Paper, Text, SimpleGrid, Stack, ActionIcon, Button, Group, Popover, Title, Container, Loader, Card, Divider, Collapse } from "@mantine/core"
import { IconX, IconUsers, IconClock, IconChevronLeft, IconChevronRight, IconChefHat } from "@tabler/icons-react"
import { getRecipes, saveRecipe, type SearchRecipe, type SearchRecipesResult } from "../../api/recipe"
import type { Recipe } from "../../api/schema"
import { notifications } from "@mantine/notifications";

function parseDescription(description: string | null): { nutrition: string; ingredients: string; steps: string } {
  if (!description) return { nutrition: "", ingredients: "", steps: "" }
  const [nutrition = "", ingredients = "", ...rest] = description.split("\n\n")
  return { nutrition, ingredients, steps: rest.join("\n\n") }
}

export function RecipeCard({
  recipe,
  isOpen,
  onToggle,
  action,
  onDelete,
}: {
  recipe: SearchRecipe | Recipe
  isOpen: boolean
  onToggle: () => void
  action?: React.ReactNode
  onDelete?: () => void
}) {
  const { nutrition, ingredients, steps } = parseDescription(recipe.description)

  return (
    <Card
      withBorder
      shadow="sm"
      radius="md"
      padding="md"
      onClick={onToggle}
      className="recipe-card"
      style={{ cursor: "pointer", minWidth: 280, maxWidth: 280, flexShrink: 0 }}
    >
      <Stack gap="sm" h="100%">
        <Stack gap={4}>
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <IconChefHat size={18} style={{ flexShrink: 0, marginTop: 2 }} color="var(--mantine-color-brand-6)" />
            <Title order={5} lineClamp={2} style={{ flex: 1 }}>{recipe.title}</Title>
          </Group>
          <Group gap="md" pl={26}>
            <Group gap={4}>
              <IconUsers size={14} color="var(--mantine-color-gray-6)" />
              <Text size="xs" c="dimmed">{recipe.servings ?? "?"}</Text>
            </Group>
            <Group gap={4}>
              <IconClock size={14} color="var(--mantine-color-gray-6)" />
              <Text size="xs" c="dimmed">{recipe.prep_time ?? "?"} min</Text>
            </Group>
          </Group>
        </Stack>

        {nutrition && (
          <Text size="xs" c="dimmed" lineClamp={isOpen ? undefined : 3} style={{ lineHeight: 1.5 }}>
            {nutrition}
          </Text>
        )}

        <Collapse expanded={isOpen}>
          <Stack gap="sm" onClick={e => e.stopPropagation()}>
            <Divider />
            {ingredients && (
              <div>
                <Text fw={600} size="sm" mb={4}>Ingredients</Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{ingredients}</Text>
              </div>
            )}
            {steps && (
              <div>
                <Text fw={600} size="sm" mb={4}>Instructions</Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{steps}</Text>
              </div>
            )}
            {onDelete && (
              <Button color="red" variant="outline" size="sm" fullWidth onClick={onDelete}>
                Remove from favourites
              </Button>
            )}
          </Stack>
        </Collapse>

        {action && (
          <div onClick={e => e.stopPropagation()} style={{ marginTop: "auto" }}>
            {action}
          </div>
        )}
      </Stack>
    </Card>
  )
}

export function RecipeCarousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 300, behavior: "smooth" })

  return (
    <Group gap="sm" wrap="nowrap" align="center">
      <ActionIcon variant="default" radius="xl" size="lg" onClick={() => scroll(-1)}>
        <IconChevronLeft size={18} />
      </ActionIcon>
      <div className="recipe-carousel" ref={ref}>{children}</div>
      <ActionIcon variant="default" radius="xl" size="lg" onClick={() => scroll(1)}>
        <IconChevronRight size={18} />
      </ActionIcon>
    </Group>
  )
}

export interface RecipesParams extends Partial<SearchRecipesResult> {
  householdId?: string;
  openRecipeId?: string;
}

export function Recipes() {
  const location = useLocation()
  const locationState = location.state as RecipesParams;
  const searchResults = locationState?.recipes ?? []
  // const householdId = locationState?.householdId
  const openRecipeId = locationState?.openRecipeId

  const [saved, setSaved] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState<number | null>(null)
  const [favourites, setFavourites] = useState<Recipe[]>([])
  const [loadingFavourites, setLoadingFavourites] = useState(true)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const noExactRecipe = locationState?.noExactRecipe ?? false
  const matchedIngredients = locationState?.matchedIngredients ?? []
  const unmatchedIngredients = locationState?.unmatchedIngredients ?? []
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // tracks which card is open: "fav-{id}" or "search-{index}"
  const [openId, setOpenId] = useState<string | null>(openRecipeId ? `fav-${openRecipeId}` : null)

  const toggle = (key: string) => setOpenId(prev => prev === key ? null : key)

  const fetchFavourites = async () => {
    try {
      const { data } = await getRecipes();
      const list = data ?? []
      setFavourites(list)
      if (openRecipeId) {
        const match = list.find(r => r.id === openRecipeId)
        if (match) setSelectedRecipe(match)
      }
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Could not load favourites",
        message: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setLoadingFavourites(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void fetchFavourites() }, [])

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("recipe").delete().eq("id", id);
    if (error) {
      notifications.show({
        color: "red",
        title: "Could not remove favourite",
        message: error.message,
      });
      return;
    }
    setFavourites(prev => prev.filter(r => r.id !== id));
    setOpenId(null);
    notifications.show({
      color: "orange",
      title: "Removed",
      message: "Recipe removed from favourites.",
    });
  };

  const handleSave = async (recipe: SearchRecipe, index: number) => {
    if (favourites.some(f => f.title === recipe.title)) {
      setSaved(prev => new Set(prev).add(index))
      return
    }
    setSaving(index)
    try {
      const result = await saveRecipe(recipe);
      if (result.error) {
        notifications.show({
          color: "red",
          title: "Could not save recipe",
          message: result.error instanceof Error ? result.error.message : "Please try again.",
        });
        return;
      }
      setSaved(prev => new Set(prev).add(index))
      void fetchFavourites()
      notifications.show({
        color: "green",
        title: "Saved",
        message: `${recipe.title} added to favourites.`,
      });
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Could not save recipe",
        message: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSaving(null)
    }
  }

  return (
      <Container size="xl" py="xl">
        {searchResults.length > 0 ? (
          <Stack gap="md" mb="xl">
            <Title order={1}>{noExactRecipe ? "No recipe found" : "Search Results"}</Title>

            <Text>
              {unmatchedIngredients.length > 0 ? (
                <>
                  No recipes found for: <Text span fw={700}>{unmatchedIngredients.join(", ")}</Text>.
                  {matchedIngredients.length > 0 && (
                    <> Showing recipes for <Text span fw={700}>{matchedIngredients.join(", ")}</Text>.</>
                  )}
                </>
              ) : (
                "Click a recipe to see instructions. Add it to favourites to save it."
              )}
            </Text>

            <RecipeCarousel>
              {searchResults.map((r, i) => (
                <RecipeCard
                  key={i}
                  recipe={r}
                  isOpen={openId === `search-${i}`}
                  onToggle={() => toggle(`search-${i}`)}
                  action={
                    <Button
                      disabled={saved.has(i) || saving === i || favourites.some(f => f.title === r.title)}
                      onClick={() => void handleSave(r, i)}
                    >
                      {saved.has(i) || favourites.some(f => f.title === r.title) ? "Already in favourites" : saving === i ? "Saving..." : "Add to favourites"}
                    </Button>
                  }
                />
              ))}
            </RecipeCarousel>
          </Stack>
        ) : (
          <Stack gap="md" mb="xl">
            <Title order={1}>No recipe found</Title>
            <Text>No recipe found.</Text>
          </Stack>
        )}

        <Title order={1} mb="md">Favourites</Title>
        {loadingFavourites ? (
          <Group justify="center" py="md"><Loader size="sm" /></Group>
        ) : favourites.length === 0 ? (
          <Text c="dimmed">No favourites yet. Search for recipes and add some.</Text>
        ) : (
          <div style={{ display: "flex", gap: "20px", alignItems: "stretch" }}>

            {/* LEFT - GRID */}
            <div style={{ flex: 1.5 }}>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                {favourites.map(r => (
                  <Paper
                    key={r.id}
                    p="md"
                    radius="md"
                    withBorder
                    shadow="sm"
                    style={{ cursor: "pointer", position: "relative" }}
                    onClick={() => setSelectedRecipe(r)}
                  >
                    <Stack gap="xs">
                      <Text fw={600} pr={32}>{r.title}</Text>

                      <Text size="sm" c="dimmed">
                        Servings: {r.servings ?? "?"} · Prep: {r.prep_time ?? "?"} min
                      </Text>

                      <Text size="xs" c="dimmed">
                        {r.description?.split("\n\n")[0] ?? ""}
                      </Text>
                    </Stack>

                    <Popover
                      opened={confirmDeleteId === r.id}
                      onClose={() => setConfirmDeleteId(null)}
                      position="bottom-end"
                      withArrow
                      shadow="md"
                    >
                      <Popover.Target>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(prev => prev === r.id ? null : r.id);
                          }}
                          style={{ position: "absolute", top: 8, right: 8 }}
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      </Popover.Target>
                      <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
                        <Stack gap="xs">
                          <Text size="sm">Remove from favourites?</Text>
                          <Group gap="xs" justify="flex-end">
                            <Button
                              size="xs"
                              variant="default"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                void handleDelete(r.id);
                              }}
                            >
                              Remove
                            </Button>
                          </Group>
                        </Stack>
                      </Popover.Dropdown>
                    </Popover>
                  </Paper>
                ))}
              </SimpleGrid>
            </div>

            {/* RIGHT - DETAIL PANEL (ONLY FAVOURITES) */}
            <div style={{ flex: 1 }}>
              {selectedRecipe ? (
                <Paper p="lg" radius="md" withBorder shadow="md">
                  <Stack>

                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => setSelectedRecipe(null)}
                    >
                      Close
                    </Button>

                    <Text fw={700} size="lg">
                      {selectedRecipe.title}
                    </Text>

                    <Text size="sm" c="dimmed">
                      Servings: {selectedRecipe.servings ?? "?"} · Prep: {selectedRecipe.prep_time ?? "?"} min
                    </Text>

                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {selectedRecipe.description}
                    </Text>
                  </Stack>
                </Paper>
              ) : (
                <Text c="dimmed">Select a recipe to see details</Text>
              )}
            </div>

          </div>
        )}
      </Container>
    )
  }