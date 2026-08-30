const Category = require('../models/Category');
const Song = require('../models/Song');
const ApiError = require('../utils/ApiError');
const { DEFAULT_CATEGORIES, LEGACY_META_CATEGORIES } = require('../constants/defaultCategories');

/**
 * Song category business logic: public listing, legacy metadata and the
 * admin CRUD used by the hidden admin panel.
 */

/**
 * Categories for the public UI. Returns the global (owner-less) categories and,
 * for an authenticated user, also that user's own private categories.
 * Falls back to the canonical defaults (without touching the DB) when the
 * global collection is still empty.
 */
const getPublicCategories = async (user) => {
  const globals = await Category.find({ owner: null }).sort({ order: 1 });
  const base = globals.length > 0 ? globals : DEFAULT_CATEGORIES;

  if (!user) return base;

  const own = await Category.find({ owner: user._id }).sort({ order: 1 });
  return [...base, ...own];
};

/**
 * Create a private category owned by the given user. The generated id (slug)
 * is globally unique. Parent may be any global or own category of the user.
 */
const createUserCategory = async (user, { name, icon, color, parentId }) => {
  if (!name || !name.trim()) {
    throw ApiError.badRequest('Назва розділу обовʼязкова');
  }

  const normalizedId = await generateUniqueId(name);

  let normalizedParent = null;
  if (parentId) {
    normalizedParent = String(parentId).toLowerCase();
    // Батьком може бути глобальний розділ або власний розділ користувача.
    const parent = await Category.findOne({
      id: normalizedParent,
      $or: [{ owner: null }, { owner: user._id }]
    });
    if (!parent) {
      throw ApiError.badRequest('Батьківську категорію не знайдено');
    }
  }

  // Ставимо приватні розділи після глобальних (щоб не змішувалися в UI).
  const ownCount = await Category.countDocuments({ owner: user._id });

  const category = new Category({
    id: normalizedId,
    name: name.trim(),
    icon: icon === undefined ? '🎵' : icon,
    color: color || '#8B4513',
    parentId: normalizedParent,
    order: 500 + ownCount,
    owner: user._id
  });

  await category.save();
  return category;
};

const getLegacyMetaCategories = () => LEGACY_META_CATEGORIES;

// Транслітерація українських літер у латиницю для генерації id (slug).
const UA_TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh',
  з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ъ: '', ы: 'y', э: 'e', ё: 'e'
};

const slugify = (text) => {
  const slug = String(text || '')
    .toLowerCase()
    .split('')
    .map((ch) => (Object.prototype.hasOwnProperty.call(UA_TRANSLIT, ch) ? UA_TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-') // все, крім латиниці/цифр → дефіс
    .replace(/^-+|-+$/g, '')     // прибираємо дефіси по краях
    .replace(/-{2,}/g, '-');     // стискаємо повтори дефісів
  return slug;
};

// Порівняння назв за українським алфавітом (регістронезалежно).
const nameCompare = (a, b) =>
  (a || '').localeCompare(b || '', 'uk', { sensitivity: 'base' });

/**
 * Вставляє категорію на алфавітну позицію в межах її групи (той самий parentId)
 * і перенумеровує order групи на 0..n. Наявний відносний порядок решти
 * зберігається, тож ручне перевпорядкування не руйнується.
 */
const placeAlphabeticallyInGroup = async (category) => {
  const parentId = category.parentId || null;
  const others = (await Category.find({ parentId }).sort({ order: 1 })).filter(
    (c) => c.id !== category.id
  );

  let insertIndex = others.findIndex((c) => nameCompare(c.name, category.name) > 0);
  if (insertIndex === -1) insertIndex = others.length;

  const ordered = [...others];
  ordered.splice(insertIndex, 0, category);

  await Promise.all(
    ordered.map((c, idx) =>
      c.order === idx ? Promise.resolve() : Category.updateOne({ _id: c._id }, { order: idx })
    )
  );
};

/**
 * Генерує унікальний id (slug) на основі назви. Якщо такий id вже існує,
 * додає числовий суфікс: name-2, name-3, ...
 */
const generateUniqueId = async (name) => {
  const base = slugify(name) || 'rozdil';
  let candidate = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Category.exists({ id: candidate })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
};

/**
 * Categories for the admin panel. Seeds the canonical defaults into the DB the
 * first time it is called on an empty collection.
 */
const getAdminCategories = async () => {
  // Адмінка керує лише глобальними (публічними) розділами.
  let categories = await Category.find({ owner: null }).sort({ order: 1 });
  if (categories.length === 0) {
    // За замовчуванням розділи впорядковані за алфавітом.
    const seeded = [...DEFAULT_CATEGORIES]
      .sort((a, b) => nameCompare(a.name, b.name))
      .map((c, idx) => ({ ...c, order: idx }));
    categories = await Category.insertMany(seeded);
  }
  return categories;
};

const createCategory = async ({ id, name, icon, color, parentId }) => {
  if (!name || !name.trim()) {
    throw ApiError.badRequest('Назва розділу обовʼязкова');
  }

  // id генерується автоматично з назви (унікальний slug). Якщо id передали
  // явно — використовуємо його, теж перевіряючи на унікальність нижче.
  const normalizedId = id && id.trim()
    ? slugify(id) || (await generateUniqueId(name))
    : await generateUniqueId(name);

  // Валідація батьківської категорії (для вкладених розділів)
  let normalizedParent = null;
  if (parentId) {
    normalizedParent = parentId.toLowerCase();
    if (normalizedParent === normalizedId) {
      throw ApiError.badRequest('Категорія не може бути власним батьком');
    }
    const parent = await Category.findOne({ id: normalizedParent });
    if (!parent) {
      throw ApiError.badRequest('Батьківську категорію не знайдено');
    }
  }

  const category = new Category({
    id: normalizedId,
    name,
    // Іконка не обовʼязкова: порожній рядок означає, що замість емодзі
    // на клієнті малюється кружечок з кольором категорії.
    icon: icon === undefined ? '🎵' : icon,
    color: color || '#8B4513',
    parentId: normalizedParent,
    order: 0
  });

  try {
    await category.save();
  } catch (error) {
    if (error.code === 11000) {
      throw ApiError.badRequest('Категорія з таким id вже існує');
    }
    throw error;
  }

  // Ставимо на алфавітну позицію серед розділів того ж рівня.
  await placeAlphabeticallyInGroup(category);

  return category;
};

const updateCategory = async (categoryId, { name, icon, color, parentId }) => {
  const category = await Category.findOne({ id: categoryId });
  if (!category) {
    throw ApiError.notFound('Категорію не знайдено');
  }

  if (name) category.name = name;
  // icon !== undefined дозволяє очистити іконку (порожній рядок → кружечок кольору)
  if (icon !== undefined) category.icon = icon;
  if (color) category.color = color;

  // Зміна батьківського розділу (переміщення у вкладеність або в корінь)
  if (parentId !== undefined) {
    if (!parentId) {
      category.parentId = null;
    } else {
      const normalizedParent = parentId.toLowerCase();
      if (normalizedParent === category.id) {
        throw ApiError.badRequest('Категорія не може бути власним батьком');
      }
      const parent = await Category.findOne({ id: normalizedParent });
      if (!parent) {
        throw ApiError.badRequest('Батьківську категорію не знайдено');
      }
      // Запобігаємо циклу: новий батько не може бути нащадком цієї категорії
      let ancestor = parent;
      while (ancestor && ancestor.parentId) {
        if (ancestor.parentId === category.id) {
          throw ApiError.badRequest('Не можна перемістити категорію у власний підрозділ');
        }
        // eslint-disable-next-line no-await-in-loop
        ancestor = await Category.findOne({ id: ancestor.parentId });
      }
      category.parentId = normalizedParent;
    }
  }

  const parentChanged = category.isModified('parentId');
  await category.save();

  // Після зміни рівня — ставимо на алфавітну позицію в новій групі.
  if (parentChanged) {
    await placeAlphabeticallyInGroup(category);
  }

  return category;
};

/**
 * Ручне перевпорядкування (drag-and-drop) розділів у межах одного рівня.
 * orderedIds — id розділів групи в бажаному порядку.
 */
const reorderCategories = async (parentId, orderedIds) => {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw ApiError.badRequest('orderedIds обовʼязковий');
  }
  const normalizedParent = parentId ? String(parentId).toLowerCase() : null;

  await Promise.all(
    orderedIds.map((id, idx) =>
      Category.updateOne(
        { id: String(id).toLowerCase(), parentId: normalizedParent },
        { order: idx }
      )
    )
  );

  return getAdminCategories();
};

const deleteCategory = async (categoryId) => {
  const category = await Category.findOneAndDelete({ id: categoryId });
  if (!category) {
    throw ApiError.notFound('Категорію не знайдено');
  }

  // Підрозділи видаленої категорії піднімаємо на рівень її батька,
  // щоб вони не лишалися "сиротами" з неіснуючим parentId.
  await Category.updateMany(
    { parentId: category.id },
    { parentId: category.parentId || null }
  );

  const affectedSongs = await Song.countDocuments({ category: categoryId });
  return { deletedCategory: category.name, affectedSongs };
};

/**
 * Rename / restyle a private category owned by the user.
 */
const updateUserCategory = async (user, categoryId, { name, icon, color }) => {
  const category = await Category.findOne({ id: categoryId, owner: user._id });
  if (!category) {
    throw ApiError.notFound('Розділ не знайдено');
  }
  if (name !== undefined) {
    if (!name.trim()) throw ApiError.badRequest('Назва розділу обовʼязкова');
    category.name = name.trim();
  }
  if (icon !== undefined) category.icon = icon;
  if (color) category.color = color;
  await category.save();
  return category;
};

/**
 * Delete a private category owned by the user. Its own subcategories are lifted
 * one level up (to this category's parent), and the user's songs in it move to
 * the parent category (or become uncategorised when there is no parent).
 */
const deleteUserCategory = async (user, categoryId) => {
  const category = await Category.findOne({ id: categoryId, owner: user._id });
  if (!category) {
    throw ApiError.notFound('Розділ не знайдено');
  }

  const fallbackCategory = category.parentId || '';

  await Category.updateMany(
    { parentId: category.id, owner: user._id },
    { parentId: category.parentId || null }
  );

  const { modifiedCount } = await Song.updateMany(
    { owner: user._id, category: category.id },
    { category: fallbackCategory }
  );

  await Category.deleteOne({ _id: category._id });

  return { deletedCategory: category.name, affectedSongs: modifiedCount || 0 };
};

module.exports = {
  getPublicCategories,
  createUserCategory,
  updateUserCategory,
  deleteUserCategory,
  getLegacyMetaCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
};
