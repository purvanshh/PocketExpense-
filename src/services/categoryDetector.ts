type CategoryKey = string;

interface KeywordMap {
    [keyword: string]: CategoryKey;
}

const KEYWORD_CATEGORY_MAP: KeywordMap = {
    // Food & Dining
    swiggy: 'food',
    zomato: 'food',
    dominos: 'food',
    'pizza hut': 'food',
    mcdonalds: 'food',
    starbucks: 'food',
    kfc: 'food',
    'burger king': 'food',
    dunkin: 'food',
    subway: 'food',
    restaurant: 'food',
    cafe: 'food',
    dhaba: 'food',
    biryani: 'food',
    eatfit: 'food',
    foodpanda: 'food',

    // Shopping
    amazon: 'shopping',
    flipkart: 'shopping',
    myntra: 'shopping',
    ajio: 'shopping',
    meesho: 'shopping',
    nykaa: 'shopping',
    snapdeal: 'shopping',
    shopsy: 'shopping',
    croma: 'shopping',
    reliance: 'shopping',
    'big bazaar': 'shopping',
    dmart: 'shopping',
    mall: 'shopping',

    // Groceries
    bigbasket: 'groceries',
    blinkit: 'groceries',
    zepto: 'groceries',
    instamart: 'groceries',
    jiomart: 'groceries',
    grofers: 'groceries',
    dunzo: 'groceries',
    supermarket: 'groceries',
    grocery: 'groceries',
    kirana: 'groceries',

    // Transport
    uber: 'travel',
    ola: 'travel',
    rapido: 'travel',
    metro: 'travel',
    irctc: 'travel',
    redbus: 'travel',
    makemytrip: 'travel',
    goibibo: 'travel',
    cleartrip: 'travel',
    yatra: 'travel',
    petrol: 'car',
    fuel: 'car',
    parking: 'car',
    fastag: 'car',
    toll: 'car',
    'indian oil': 'car',
    'hp fuel': 'car',
    bharat: 'car',

    // Entertainment
    netflix: 'entertainment',
    hotstar: 'entertainment',
    prime: 'entertainment',
    spotify: 'entertainment',
    youtube: 'entertainment',
    'book my show': 'entertainment',
    bookmyshow: 'entertainment',
    pvr: 'entertainment',
    inox: 'entertainment',
    gaana: 'entertainment',

    // Subscriptions
    subscription: 'subscription',
    'auto renewal': 'subscription',
    recurring: 'subscription',
    membership: 'subscription',

    // Bills
    electricity: 'home',
    electric: 'home',
    'power bill': 'home',
    gas: 'home',
    'water bill': 'water',
    broadband: 'internet',
    wifi: 'internet',
    airtel: 'internet',
    jio: 'internet',
    'vi ': 'internet',
    vodafone: 'internet',
    bsnl: 'internet',

    // Insurance
    'life insurance': 'insurance',
    'health insurance': 'insurance',
    lic: 'insurance',
    'star health': 'insurance',
    'max bupa': 'insurance',
    premium: 'insurance',

    // Rent
    rent: 'rent',
    'house rent': 'rent',
    landlord: 'rent',

    // Education
    school: 'education',
    college: 'education',
    university: 'education',
    tuition: 'education',
    course: 'education',
    udemy: 'education',
    coursera: 'education',
    unacademy: 'education',
    byju: 'education',

    // Gym / Fitness
    gym: 'gym',
    fitness: 'gym',
    cult: 'gym',
    'cult.fit': 'gym',

    // Salary / Income
    salary: 'salary',
    'sal credit': 'salary',
    neft: 'salary',
    'imps cr': 'salary',
};

export function detectCategory(merchant: string, description?: string): CategoryKey {
    const searchText = `${merchant} ${description || ''}`.toLowerCase();

    for (const [keyword, category] of Object.entries(KEYWORD_CATEGORY_MAP)) {
        if (searchText.includes(keyword)) {
            return category;
        }
    }

    return 'other';
}

export function getAllCategoryKeywords(): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};
    for (const [keyword, category] of Object.entries(KEYWORD_CATEGORY_MAP)) {
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(keyword);
    }
    return grouped;
}
