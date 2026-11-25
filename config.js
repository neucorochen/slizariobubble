window.AERO_CONFIG = {
  // 1. Вставь Project URL из Supabase (Project Settings -> Data API)
  SUPABASE_URL: "https://rtxmxzleaxnftprfxcxj.supabase.co",
  // 2. Вставь ПОЛНЫЙ верхний ключ (Publishable), скопированный по кнопке
  SUPABASE_KEY: "sb_publishable_6TId99dojm1Ns79eIjXWQg_VkVNw_ВСТАВЬ_ОСТАТОК",

  WORLD_RADIUS: 1850,
  FOOD_COUNT: 270,
  BOT_COUNT: 12,
  BOT_RESPAWN_MIN: 5000,
  BOT_RESPAWN_MAX: 9000,
  BASE_SPEED: 185,
  BOOST_SPEED: 325,
  TURN_SPEED: 8.8,
  SEGMENT_SPACING: 8,

  BODIES: [
    { id: "worm",        name: "Червячок",   icon: "🫧", price: 0 },
    { id: "caterpillar", name: "Гусеничка",  icon: "🐛", price: 45 },
    { id: "centipede",   name: "Многоножка", icon: "✨", price: 75 },
    { id: "robot",       name: "Аэро-Робот", icon: "🤖", price: 110 }
  ],

  SKINS: [
    { id: "aqua",       name: "Аква Гель",      price: 0,   colors: ["#67e8f9", "#38bdf8", "#a5f3fc"] },
    { id: "mint",       name: "Мятный Сорбет",  price: 0,   colors: ["#6ee7b7", "#34d399", "#bbf7d0"] },
    { id: "peach_milk", name: "Персик Крем",    price: 30,  colors: ["#fdba74", "#fda4af", "#ffedd5"] },
    { id: "sakura",     name: "Сакура Желе",    price: 40,  colors: ["#f9a8d4", "#fbcfe8", "#f472b6"] },
    { id: "sky_candy",  name: "Облачная Вата",  price: 50,  colors: ["#93c5fd", "#f9a8d4", "#e0f2fe"] },
    { id: "lemon_drop", name: "Лимон Леденец",  price: 55,  colors: ["#fde047", "#bef264", "#fef9c3"] },
    { id: "lavender",   name: "Лаванда Сон",    price: 65,  colors: ["#d8b4fe", "#c084fc", "#f3e8ff"] },
    { id: "melon",      name: "Дыня & Мята",    price: 75,  colors: ["#86efac", "#fde047", "#bbf7d0"] },
    { id: "berry_soda", name: "Ягодная Сода",   price: 85,  colors: ["#f472b6", "#c084fc", "#7dd3fc"] },
    { id: "pearl",      name: "Жемчуг 2006",    price: 100, colors: ["#f1f5f9", "#bae6fd", "#fbcfe8"] },
    { id: "aurora",     name: "Аврора Небо",    price: 120, colors: ["#38bdf8", "#a78bfa", "#34d399"] },
    { id: "prism",      name: "Пастель Радуга", price: 160, colors: ["#7dd3fc", "#86efac", "#fde047", "#f9a8d4", "#c4b5fd"] },
    { id: "custom",     name: "Свой цвет 🎨",   price: 250, isCustom: true, icon: "🎨", colors: ["#38bdf8", "#f472b6", "#4ade80"] }
  ],

  HATS: [
    { id: "none",     name: "Без шапки",   icon: "⭕", price: 0 },
    { id: "leaf",     name: "Росточек",    icon: "🌱", price: 25 },
    { id: "bow",      name: "Бантик",      icon: "🎀", price: 40 },
    { id: "bubble",   name: "Пузырик",     icon: "🫧", price: 55 },
    { id: "cat_ears", name: "Ушки котика", icon: "🐱", price: 70 },
    { id: "crown",    name: "Коронка",     icon: "👑", price: 95 },
    { id: "halo",     name: "Нимб",        icon: "😇", price: 120 }
  ],

  EYES: [
    { id: "kawaii", name: "Кавайные",  icon: "◕‿◕", price: 0 },
    { id: "aero",   name: "Линзы",     icon: "◉_◉", price: 30 },
    { id: "cat",    name: "Кошачьи",   icon: "🐱",  price: 55 },
    { id: "star",   name: "Звёздочки", icon: "★_★", price: 75 },
    { id: "heart",  name: "Сердечки",  icon: "😍",  price: 95 },
    { id: "cool",   name: "Очки Y2K",  icon: "🕶️",  price: 120 }
  ],

  PATTERNS: [
    { id: "gloss",   name: "Желе",     icon: "💧", price: 0 },
    { id: "stripes", name: "Полоски",  icon: "〰️", price: 35 },
    { id: "bubbles", name: "Пузырьки", icon: "🫧", price: 65 },
    { id: "sparkle", name: "Блёстки",  icon: "✨", price: 90 }
  ],

  AURAS: [
    { id: "none",    name: "Без ауры",    icon: "⭕", color: null,      price: 0 },
    { id: "cyan",    name: "Аква Сияние", icon: "🩵", color: "#38bdf8", price: 45 },
    { id: "lime",    name: "Мятный Свет", icon: "💚", color: "#4ade80", price: 45 },
    { id: "pink",    name: "Сакура Блик", icon: "🩷", color: "#f472b6", price: 70 },
    { id: "rainbow", name: "Призма Аэро", icon: "🌈", color: "rainbow", price: 115 }
  ],

  BOT_NAMES: [
    "VistaChan", "AeroBubble", "MochiDrop", "Minty", "GlassFish",
    "SkyJelly", "Aqua2008", "LimePop", "Crystal", "DewDrop", "SunnyOS", "Bubblegum"
  ]
};
