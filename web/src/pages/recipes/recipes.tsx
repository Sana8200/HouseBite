import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { supabase } from "../../supabase"
import "./recipes.css"
import { Text, SimpleGrid, Stack, ActionIcon, Button, Group, Title, Container, Loader, Card, Divider, Modal, Popover, ThemeIcon, Paper } from "@mantine/core"
import { IconUsers, IconClock, IconChevronLeft, IconChevronRight, IconChefHat, IconX, IconHeart } from "@tabler/icons-react"
import { getRecipes, saveRecipe, type SearchRecipe, type SearchRecipesResult } from "../../api/recipe"
import type { Recipe } from "../../api/schema"
import { notifications } from "@mantine/notifications";
import { CustomLoader } from "../../components/CustomLoader"

function parseDescription(description: string | null): { nutrition: string; ingredients: string; steps: string } {
  if (!description) return { nutrition: "", ingredients: "", steps: "" }
  const [nutrition = "", ingredients = "", ...rest] = description.split("\n\n")
  return { nutrition, ingredients, steps: rest.join("\n\n") }
}

export function RecipeCard({
  recipe,
  onOpen,
  onDelete,
  action,
}: {
  recipe: SearchRecipe | Recipe
  onOpen: () => void
  onDelete?: () => void
  action?: React.ReactNode
}) {
  const { nutrition } = parseDescription(recipe.description)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Card
      withBorder
      shadow="sm"
      radius="xl"
      padding="lg"
      onClick={onOpen}
      className="recipe-card"
      style={{ cursor: "pointer", height: "100%", position: "relative" }}
    >
      <Stack gap="sm" h="100%">
        <Stack gap={6}>
          <Group gap="xs" wrap="nowrap" align="flex-start" pr={onDelete ? 28 : 0}>
            <ThemeIcon size="md" radius="md" variant="light" color="orange" style={{ flexShrink: 0 }}>
              <IconChefHat size={16} />
            </ThemeIcon>
            <Text fw={700} size="md" lineClamp={2} style={{ flex: 1, lineHeight: 1.3 }}>{recipe.title}</Text>
          </Group>
          <Group gap="lg" pl={36}>
            <Group gap={4}>
              <IconUsers size={14} color="var(--color-text-muted)" />
              <Text size="xs" c="dimmed">{recipe.servings ?? "?"} servings</Text>
            </Group>
            <Group gap={4}>
              <IconClock size={14} color="var(--color-text-muted)" />
              <Text size="xs" c="dimmed">{recipe.prep_time ?? "?"} min</Text>
            </Group>
          </Group>
        </Stack>

        {nutrition && (
          <Text size="xs" c="dimmed" lineClamp={3} style={{ lineHeight: 1.5 }}>
            {nutrition}
          </Text>
        )}

        {action && (
          <div onClick={e => e.stopPropagation()} style={{ marginTop: "auto" }}>
            {action}
          </div>
        )}
      </Stack>

      {onDelete && (
        <Popover
          opened={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          position="bottom-end"
          withArrow
          shadow="md"
        >
          <Popover.Target>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation()
                setConfirmDelete(prev => !prev)
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
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                >
                  Cancel
                </Button>
                <Button
                  size="xs"
                  color="red"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); onDelete() }}
                >
                  Remove
                </Button>
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      )}
    </Card>
  )
}

export function RecipeCarousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      setCanLeft(el.scrollLeft > 0)
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    Array.from(el.children).forEach(c => ro.observe(c))
    return () => {
      el.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [children])

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 300, behavior: "smooth" })

  return (
    <Group gap="sm" wrap="nowrap" align="stretch">
      <ActionIcon
        variant="default"
        radius="xl"
        size="lg"
        onClick={() => scroll(-1)}
        style={{ visibility: canLeft ? "visible" : "hidden" }}
      >
        <IconChevronLeft size={18} />
      </ActionIcon>
      <div className="recipe-carousel" ref={ref}>{children}</div>
      <ActionIcon
        variant="default"
        radius="xl"
        size="lg"
        onClick={() => scroll(1)}
        style={{ visibility: canRight ? "visible" : "hidden" }}
      >
        <IconChevronRight size={18} />
      </ActionIcon>
    </Group>
  )
}

export interface RecipesParams extends Partial<SearchRecipesResult> {
  householdId?: string;
  openRecipeId?: string;
}

type ModalState =
  | { kind: "search"; recipe: SearchRecipe; index: number }
  | { kind: "fav"; recipe: Recipe }
  | null

export function Recipes() {
  const location = useLocation()
  const locationState = location.state as RecipesParams | null;
  const hasSearch = locationState?.recipes !== undefined
  const searchResults = locationState?.recipes ?? []
  const openRecipeId = locationState?.openRecipeId

  const [saved, setSaved] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState<number | null>(null)
  const [removing, setRemoving] = useState(false)
  const [favourites, setFavourites] = useState<Recipe[]>([])
  const [loadingFavourites, setLoadingFavourites] = useState(true)
  const [modalRecipe, setModalRecipe] = useState<ModalState>(null)
  const matchedIngredients = locationState?.matchedIngredients ?? []
  const unmatchedIngredients = locationState?.unmatchedIngredients ?? []

  const fetchFavourites = async () => {
    try {
      const { data } = await getRecipes();
      const list = data ?? []
      setFavourites(list)
      if (openRecipeId) {
        const match = list.find(r => r.id === openRecipeId)
        if (match) setModalRecipe({ kind: "fav", recipe: match })
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
    setRemoving(true)
    const { error } = await supabase.from("recipe").delete().eq("id", id);
    setRemoving(false)
    if (error) {
      notifications.show({
        color: "red",
        title: "Could not remove favourite",
        message: error.message,
      });
      return;
    }
    setFavourites(prev => prev.filter(r => r.id !== id));
    setModalRecipe(null);
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

  const renderModalBody = () => {
    if (!modalRecipe) return null
    const recipe = modalRecipe.recipe
    const { nutrition, ingredients, steps } = parseDescription(recipe.description)
    const isAlreadyFav = modalRecipe.kind === "search"
      && (favourites.some(f => f.title === recipe.title) || saved.has(modalRecipe.index))

    return (
      <Stack gap="md">
        <Group gap="lg">
          <Group gap={6}>
            <IconUsers size={16} color="var(--mantine-color-gray-6)" />
            <Text size="sm" c="dimmed">Serves {recipe.servings ?? "?"}</Text>
          </Group>
          <Group gap={6}>
            <IconClock size={16} color="var(--mantine-color-gray-6)" />
            <Text size="sm" c="dimmed">{recipe.prep_time ?? "?"} min</Text>
          </Group>
        </Group>

        {nutrition && (
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>{nutrition}</Text>
        )}

        {ingredients && (
          <>
            <Divider />
            <div>
              <Title order={5} mb={6}>Ingredients</Title>
              <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{ingredients}</Text>
            </div>
          </>
        )}

        {steps && (
          <>
            <Divider />
            <div>
              <Title order={5} mb={6}>Instructions</Title>
              <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{steps}</Text>
            </div>
          </>
        )}

        <Divider />

        {modalRecipe.kind === "search" ? (
          <Button
            disabled={isAlreadyFav}
            loading={saving === modalRecipe.index}
            onClick={() => void handleSave(modalRecipe.recipe, modalRecipe.index)}
          >
            {isAlreadyFav ? "Already in favourites" : "Add to favourites"}
          </Button>
        ) : (
          <Button
            color="red"
            variant="outline"
            loading={removing}
            onClick={() => void handleDelete(modalRecipe.recipe.id)}
          >
            Remove from favourites
          </Button>
        )}
      </Stack>
    )
  }

  return (
      <Container size="xl" py="xl">
        <Stack gap="xs" mb="xl">
          <Group gap="sm">
            <ThemeIcon size="xl" radius="md" variant="light" color="orange">
              <IconChefHat size={24} />
            </ThemeIcon>
            <Title order={1} size="h2">Recipes</Title>
          </Group>
          <Text c="dimmed">
            {!hasSearch ? (
              "Browse your saved favourites or search for new recipes from the dashboard."
            ) : searchResults.length === 0 ? (
              "No recipes match your search. Try removing some ingredients or restrictions."
            ) : unmatchedIngredients.length > 0 ? (
              <>
                No recipe found for <Text span fw={700} c="bright">{unmatchedIngredients.join(", ")}</Text>.
                {matchedIngredients.length > 0 ? (
                  <> Recipes found for <Text span fw={700} c="bright">{matchedIngredients.join(", ")}</Text>:</>
                ) : (
                  <> Instead some suggestions for you:</>
                )}
              </>
            ) : (
              "Here are some recipes based on your search. Click one to see full details."
            )}
          </Text>
        </Stack>

        {hasSearch && searchResults.length > 0 && (
          <Stack gap="md" mb="xl">
            <RecipeCarousel>
                  {searchResults.map((r, i) => {
                    const isAlreadyFav = saved.has(i) || favourites.some(f => f.title === r.title)
                    return (
                      <div key={i} className="recipe-carousel-item">
                        <RecipeCard
                          recipe={r}
                          onOpen={() => setModalRecipe({ kind: "search", recipe: r, index: i })}
                          action={
                            <Button
                              fullWidth
                              radius="md"
                              disabled={isAlreadyFav}
                              loading={saving === i}
                              onClick={() => void handleSave(r, i)}
                            >
                              {isAlreadyFav ? "Already in favourites" : "Add to favourites"}
                            </Button>
                          }
                        />
                      </div>
                    )
                  })}
                </RecipeCarousel>
          </Stack>
        )}

        <Stack gap="md">
          <Group gap="xs">
            <IconHeart size={20} color="var(--mantine-color-red-6)" />
            <Title order={2} size="h3">Your favourites</Title>
          </Group>
          {loadingFavourites ? (
            <Group justify="center" py="xl"><CustomLoader size="sm" /></Group>
          ) : favourites.length === 0 ? (
            <Paper withBorder p="xl" radius="lg">
              <Stack align="center" gap="xs">
                <IconHeart size={32} color="var(--color-text-muted)" />
                <Text c="dimmed" ta="center">
                  No favourites yet. Search for recipes from the dashboard and save the ones you like.
                </Text>
              </Stack>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {favourites.map(r => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  onOpen={() => setModalRecipe({ kind: "fav", recipe: r })}
                  onDelete={() => void handleDelete(r.id)}
                />
              ))}
            </SimpleGrid>
          )}
        </Stack>

        <Modal
          opened={modalRecipe !== null}
          onClose={() => setModalRecipe(null)}
          size="lg"
          centered
          radius="md"
          title={
            <Group gap="xs" wrap="nowrap">
              <IconChefHat size={22} color="var(--mantine-color-brand-6)" />
              <Title order={4}>{modalRecipe?.recipe.title}</Title>
            </Group>
          }
        >
          {renderModalBody()}
        </Modal>
      </Container>
    )
  }
