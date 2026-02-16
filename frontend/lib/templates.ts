/**
 * List templates: only default title and description (i18n keys).
 * User adds items themselves after creating the list.
 */

export type ListTemplateId = "empty" | "birthday" | "wedding" | "babyShower" | "housewarming";

export interface ListTemplate {
  id: ListTemplateId;
  /** i18n key for template name (e.g. lists.birthday) */
  nameKey: string;
  /** i18n key for default list title (e.g. templates.birthdayTitle) */
  titleKey: string;
  /** i18n key for default list description (e.g. templates.birthdayDesc) */
  descriptionKey: string;
}

export const LIST_TEMPLATES: ListTemplate[] = [
  {
    id: "empty",
    nameKey: "lists.custom",
    titleKey: "lists.titlePlaceholder",
    descriptionKey: "lists.descriptionPlaceholder",
  },
  {
    id: "birthday",
    nameKey: "lists.birthday",
    titleKey: "templates.birthdayTitle",
    descriptionKey: "templates.birthdayDesc",
  },
  {
    id: "wedding",
    nameKey: "lists.wedding",
    titleKey: "templates.weddingTitle",
    descriptionKey: "templates.weddingDesc",
  },
  {
    id: "babyShower",
    nameKey: "lists.babyShower",
    titleKey: "templates.babyShowerTitle",
    descriptionKey: "templates.babyShowerDesc",
  },
  {
    id: "housewarming",
    nameKey: "lists.housewarming",
    titleKey: "templates.housewarmingTitle",
    descriptionKey: "templates.housewarmingDesc",
  },
];

export function getTemplateById(id: ListTemplateId): ListTemplate | undefined {
  return LIST_TEMPLATES.find((t) => t.id === id);
}
