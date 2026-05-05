import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { supabase } from "../../supabase"
import "./recipes.css"
import { Text, SimpleGrid, Stack, ActionIcon, Button, Group, Title, Container, Card, Divider, Modal, Popover, ThemeIcon, Paper, Select } from "@mantine/core"
import { IconUsers, IconClock, IconChevronLeft, IconChevronRight, IconChefHat, IconX, IconHeart, IconShoppingCart } from "@tabler/icons-react"
import { getRecipes, saveRecipe, type SearchRecipe, type SearchRecipesResult } from "../../api/recipe"
import type { Household, Recipe } from "../../api/schema"
import { notifications } from "@mantine/notifications";
import { CustomLoader } from "../../components/CustomLoader"
import { getHouseholds } from "../../api/household";
import { addShoppingListItem, getShoppingItems } from "../../api/shoppingList";
import { getPantryProductNames } from "../../api/product";

function parseDescription(description: string | null): { nutrition: string; ingredients: string; steps: string } {
  if (!description) return { nutrition: "", ingredients: "", steps: "" }
  const [nutrition = "", ingredients = "", ...rest] = description.split("\n\n")
  return { nutrition, ingredients, steps: rest.join("\n\n") }
}

const LEADING_UNITS = new Set([
  "g", "gr", "gram", "grams", "kg", "ml", "l", "cl", "dl",
  "tbsp", "tbsps", "tablespoon", "tablespoons", "tsp", "tsps", "teaspoon", "teaspoons",
  "cup", "cups", "oz", "lb", "lbs", "pound", "pounds",
  "slice", "slices", "can", "cans", "tin", "tins", "pack", "packs",
  "piece", "pieces", "clove", "cloves", "bunch", "bunches", "pinch", "pinches",
]);

const LEADING_QUALIFIERS = new Set([
  "about", "approx", "approximately", "around", "some", "a", "an",
]);

const TRAILING_PREPARATIONS = [
  "to taste", "for serving", "for garnish", "optional", "divided",
  "minced", "chopped", "diced", "sliced", "grated", "crushed",
  "softened", "melted", "beaten", "peeled", "rinsed", "drained",
];

interface ParsedIngredient {
  original: string;
  name: string;
  normalizedName: string;
  notes: string;
}

function isQuantityToken(token: string) {
  return /^\d+([.,]\d+)?$/.test(token)
    || /^\d+\/\d+$/.test(token)
    || /^\d+\-\d+$/.test(token);
}

// Normalize recipe and pantry names into a comparable form for matching.
function normalizeProductName(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(\w+)es\b/g, "$1")
    .replace(/\b(\w+)s\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Keep quantity/preparation details in notes after removing the ingredient name itself.
function extractIngredientNotes(original: string, ingredientName: string) {
  const normalizedOriginal = original.replace(/\s+/g, " ").trim();
  const escapedName = ingredientName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const namePattern = new RegExp(`\\b${escapedName}\\b`, "i");

  if (namePattern.test(normalizedOriginal)) {
    const [beforeName, afterName = ""] = normalizedOriginal.split(namePattern, 2);
    const note = `${beforeName} ${afterName}`
      .replace(/\s+,/g, ",")
      .replace(/\(\s*\)/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[-,:;]+/, "")
      .replace(/[-,:;]+$/, "")
      .trim();

    return note;
  }

  return "";
}

function extractIngredientName(line: string) {
  const beforeComma = line.split(",")[0] ?? line;
  const cleaned = beforeComma
    .replace(/[•*-]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned.split(" ").filter(Boolean);
  let start = 0;

  // Skip leading quantities and units until we reach the ingredient name.
  while (start < tokens.length) {
    const token = tokens[start].toLowerCase();
    if (isQuantityToken(token) || LEADING_UNITS.has(token) || LEADING_QUALIFIERS.has(token)) {
      start += 1;
      continue;
    }
    break;
  }

  let name = tokens.slice(start).join(" ").trim();
  if (!name) name = cleaned;

  // Drop common preparation suffixes so "onion, chopped" matches pantry "onion".
  for (const preparation of TRAILING_PREPARATIONS) {
    const pattern = new RegExp(`\\b${preparation.replace(/\s+/g, "\\s+")}\\b.*$`, "i");
    name = name.replace(pattern, "").trim();
  }

  return name || cleaned;
}

function parseIngredientLines(ingredientsBlock: string) {
  return ingredientsBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    // Convert each raw ingredient line into a comparable name plus optional shopping-list notes.
    .map((original) => {
      const name = extractIngredientName(original);
      return {
        original,
        name,
        normalizedName: normalizeProductName(name),
        notes: extractIngredientNotes(original, name),
      } satisfies ParsedIngredient;
    })
    .filter((ingredient) => ingredient.normalizedName.length > 0);
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
  const [households, setHouseholds] = useState<Household[]>([])
  const [loadingHouseholds, setLoadingHouseholds] = useState(false)
  const [selectedCookHouseholdId, setSelectedCookHouseholdId] = useState<string | null>(locationState?.householdId ?? null)
  const [householdPickerOpen, setHouseholdPickerOpen] = useState(false)
  const [addingMissingIngredients, setAddingMissingIngredients] = useState(false)
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

  useEffect(() => {
    if (locationState?.householdId) {
      setSelectedCookHouseholdId(locationState.householdId);
    }
  }, [locationState?.householdId]);

  const loadHouseholds = async () => {
    if (loadingHouseholds) return households;

    setLoadingHouseholds(true);
    try {
      const { data, error } = await getHouseholds();
      if (error) throw error;
      const list = data ?? [];
      setHouseholds(list);
      return list;
    } finally {
      setLoadingHouseholds(false);
    }
  };

  const addMissingIngredientsToShoppingList = async (householdId: string) => {
    if (!modalRecipe) return;

    // Convert the free-text ingredients block into comparable ingredient entries.
    const { ingredients } = parseDescription(modalRecipe.recipe.description);
    const parsedIngredients = parseIngredientLines(ingredients);

    // Stop early when the recipe does not expose ingredient lines in a usable format.
    if (parsedIngredients.length === 0) {
      notifications.show({
        color: "yellow",
        title: "No ingredients found",
        message: "This recipe does not include a usable ingredients list.",
      });
      return;
    }

    setAddingMissingIngredients(true);

    try {
      // Read pantry and shopping-list data together before resolving missing ingredients.
      const [pantryProductNames, shoppingItems] = await Promise.all([
        getPantryProductNames(householdId),
        getShoppingItems(householdId),
      ]);

      // Normalize names first so simple plural and punctuation differences still match.
      const pantryNames = new Set(
        pantryProductNames
          .map((productName) => normalizeProductName(productName))
          .filter(Boolean)
      );

      const shoppingNames = new Set(
        shoppingItems.map((item) => normalizeProductName(item.name)).filter(Boolean)
      );

      // Keep only ingredients that are missing from both pantry and shopping list.
      // The findIndex check also removes duplicates inside the same recipe.
      const uniqueMissingIngredients = parsedIngredients.filter((ingredient, index, list) => {
        if (pantryNames.has(ingredient.normalizedName) || shoppingNames.has(ingredient.normalizedName)) {
          return false;
        }

        return list.findIndex((candidate) => candidate.normalizedName === ingredient.normalizedName) === index;
      });

      // Nothing to add when every ingredient is already covered by pantry or pending purchase.
      if (uniqueMissingIngredients.length === 0) {
        notifications.show({
          color: "green",
          title: "Nothing to add",
          message: "All recipe ingredients are already in the pantry or shopping list.",
        });
        return;
      }

      // Create one shopping-list row per missing ingredient.
      // `name` stores the cleaned product name and `notes` keeps quantity/preparation details.
      await Promise.all(
        uniqueMissingIngredients.map((ingredient) =>
          addShoppingListItem(
            householdId,
            ingredient.name,
            ingredient.notes
          )
        )
      );

      notifications.show({
        color: "green",
        title: "Shopping list updated",
        message: `${uniqueMissingIngredients.length} ingredient${uniqueMissingIngredients.length === 1 ? "" : "s"} added for ${modalRecipe.recipe.title}.`,
      });
    } catch (e) {
      // Surface any failure from pantry lookup, shopping-list lookup, or item creation.
      notifications.show({
        color: "red",
        title: "Could not update shopping list",
        message: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      // Always reset the loading state and close the household picker if it was open.
      setAddingMissingIngredients(false);
      setHouseholdPickerOpen(false);
    }
  };

  const handleCookThis = async () => {
    try {
      const list = await loadHouseholds();

      // Skip the household picker when the user only belongs to one household.
      if (list.length === 1) {
        const onlyHouseholdId = list[0].id;
        setSelectedCookHouseholdId(onlyHouseholdId);
        await addMissingIngredientsToShoppingList(onlyHouseholdId);
        return;
      }

      // Defer the action until the user chooses a target household.
      if (list.length > 0) {
        setSelectedCookHouseholdId(null);
        setHouseholdPickerOpen(true);
        return;
      }

      // Reaching this point means there is no valid household target for the shopping list.
      notifications.show({
        color: "yellow",
        title: "No household available",
        message: "Join or create a household before adding recipe ingredients to a shopping list.",
      });
    } catch (e) {
      // Household lookup can fail independently from the shopping-list update flow.
      notifications.show({
        color: "red",
        title: "Could not load households",
        message: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

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

        <Button
          leftSection={<IconShoppingCart size={16} />}
          variant="light"
          loading={addingMissingIngredients}
          onClick={() => void handleCookThis()}
        >
          I want to cook this
        </Button>

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

        <Modal
          opened={householdPickerOpen}
          onClose={() => setHouseholdPickerOpen(false)}
          centered
          title="Choose household"
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Select which household should receive the missing ingredients.
            </Text>
            <Select
              label="Household"
              data={households.map((household) => ({
                value: household.id,
                label: household.house_name,
              }))}
              value={selectedCookHouseholdId}
              onChange={setSelectedCookHouseholdId}
              searchable
              nothingFoundMessage="No households"
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setHouseholdPickerOpen(false)}>
                Cancel
              </Button>
              <Button
                leftSection={<IconShoppingCart size={16} />}
                loading={addingMissingIngredients}
                disabled={!selectedCookHouseholdId}
                onClick={() => {
                  if (!selectedCookHouseholdId) return;
                  setHouseholdPickerOpen(false);
                  setModalRecipe(null);
                  void addMissingIngredientsToShoppingList(selectedCookHouseholdId);
                }}
              >
                Add missing ingredients
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Container>
    )
  }
