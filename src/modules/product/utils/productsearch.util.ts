export function normalizeSearch(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ");
}


export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SEARCH_SYNONYMS: Record<string, string[]> = {
    biscuit: [
        "biscuit",
        "biscuits",
        "biskit",
        "biskits",
        "cookie",
        "cookies",
    ],

    biscuits: [
        "biscuit",
        "biscuits",
        "biskit",
        "biskits",
        "cookie",
        "cookies",
    ],

    biskit: [
        "biscuit",
        "biscuits",
        "cookie",
        "cookies",
    ],

    biskits: [
        "biscuit",
        "biscuits",
        "cookie",
        "cookies",
    ],

    cookie: [
        "cookie",
        "cookies",
        "biscuit",
        "biscuits",
    ],

    cookies: [
        "cookie",
        "cookies",
        "biscuit",
        "biscuits",
    ],

    milk: [
        "milk",
        "doodh",
    ],

    doodh: [
        "milk",
    ],

    curd: [
        "curd",
        "dahi",
        "yogurt",
        "yoghurt",
    ],

    dahi: [
        "curd",
        "dahi",
        "yogurt",
        "yoghurt",
    ],

    yogurt: [
        "curd",
        "dahi",
        "yogurt",
        "yoghurt",
    ],

    yoghurt: [
        "curd",
        "dahi",
        "yogurt",
        "yoghurt",
    ],

    rice: [
        "rice",
        "chawal",
    ],

    chawal: [
        "rice",
    ],

    atta: [
        "atta",
        "flour",
    ],

    flour: [
        "atta",
        "flour",
    ],

    tomato: [
        "tomato",
        "tomatoes",
        "tamatar",
    ],

    tomatoes: [
        "tomato",
        "tomatoes",
        "tamatar",
    ],

    tamatar: [
        "tomato",
        "tomatoes",
    ],

    potato: [
        "potato",
        "potatoes",
        "aloo",
    ],

    potatoes: [
        "potato",
        "potatoes",
        "aloo",
    ],

    aloo: [
        "potato",
        "potatoes",
    ],

    bread: [
        "bread",
        "breads",
    ],

    breads: [
        "bread",
        "breads",
    ],
};


export function getSearchTerms(
    keyword: string
): string[] {
    const normalized = normalizeSearch(keyword);

    if (!normalized) {
        return [];
    }

    const terms = new Set<string>();

    terms.add(normalized);

    const words = normalized.split(" ");

    for (const word of words) {
        terms.add(word);

        const synonyms = SEARCH_SYNONYMS[word];

        if (synonyms) {
            synonyms.forEach((term) => {
                terms.add(term);
            });
        }
    }

    return Array.from(terms);
}