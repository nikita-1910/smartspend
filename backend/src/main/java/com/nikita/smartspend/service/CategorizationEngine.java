package com.nikita.smartspend.service;

import com.nikita.smartspend.entity.Category;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Rule-Based Auto-Categorisation Engine
 *
 * Analyses a transaction's description text and assigns the most
 * likely spending category using keyword matching rules.
 *
 * Design decisions:
 *  - Rules are stored in a LinkedHashMap to preserve priority order.
 *    The first matching rule wins — more specific rules are listed first.
 *  - Case-insensitive matching prevents "Swiggy" vs "swiggy" misses.
 *  - Returns Category.OTHER if no rule matches — never null.
 *  - No ML or external API — pure Java, zero cost, zero latency.
 *
 * Interview talking point:
 *  This is the Strategy + Rule Engine pattern. Each entry in the map
 *  is a rule: if the description contains any of the keywords,
 *  assign that category. New categories are added by extending the map.
 *  No other code changes needed — open for extension, closed for modification
 *  (Open-Closed Principle from SOLID).
 */
@Service
@Slf4j
public class CategorizationEngine {

    /**
     * Keyword rules, ordered by specificity.
     * Key: Category to assign.
     * Value: List of keywords that trigger this category.
     */
    private static final Map<Category, List<String>> RULES = new LinkedHashMap<>();

    static {
        RULES.put(Category.FOOD_AND_DINING, List.of(
            "swiggy", "zomato", "restaurant", "cafe", "coffee",
            "food", "meal", "lunch", "dinner", "breakfast",
            "pizza", "burger", "biryani", "hotel", "dhaba",
            "dominos", "kfc", "mcdonalds", "subway", "chai",
            "bakery", "juice", "snack", "canteen", "mess"
        ));

        RULES.put(Category.TRANSPORT, List.of(
            "uber", "ola", "rapido", "auto", "taxi", "cab",
            "fuel", "petrol", "diesel", "bus", "metro", "train",
            "railway", "irctc", "flight", "airline", "indigo",
            "spicejet", "airasia", "toll", "parking", "rickshaw",
            "fastag", "redbus", "ticket", "travel pass"
        ));

        RULES.put(Category.SHOPPING, List.of(
            "amazon", "flipkart", "myntra", "meesho", "ajio",
            "nykaa", "reliance", "big bazaar", "dmart", "mall",
            "clothes", "shirt", "shoes", "bag", "watch",
            "electronics", "mobile", "laptop", "headphones",
            "grocery", "supermarket", "zepto", "blinkit", "instamart"
        ));

        RULES.put(Category.UTILITIES, List.of(
            "electricity", "water bill", "gas bill", "internet",
            "broadband", "wifi", "jio", "airtel", "vi ", "bsnl",
            "mobile recharge", "dth", "tata sky", "dish tv",
            "lpg", "cylinder", "maintenance", "society"
        ));

        RULES.put(Category.ENTERTAINMENT, List.of(
            "netflix", "prime", "hotstar", "disney", "zee5",
            "spotify", "gaana", "youtube premium", "movie",
            "cinema", "pvr", "inox", "games", "gaming",
            "steam", "playstation", "xbox", "concert", "event",
            "bookmyshow", "amusement", "park", "club", "pub", "bar"
        ));

        RULES.put(Category.HEALTHCARE, List.of(
            "hospital", "clinic", "doctor", "medicine", "pharmacy",
            "apollo", "medplus", "netmeds", "1mg", "pharmeasy",
            "lab", "diagnostic", "test", "health", "dental",
            "gym", "fitness", "yoga", "protein", "supplement"
        ));

        RULES.put(Category.EDUCATION, List.of(
            "udemy", "coursera", "upgrad", "college", "school",
            "tuition", "coaching", "books", "stationery",
            "exam", "fee", "certification", "course",
            "unacademy", "byju", "vedantu", "skillshare"
        ));

        RULES.put(Category.RENT_AND_HOUSING, List.of(
            "rent", "landlord", "housing", "pg ", "hostel",
            "deposit", "lease", "accommodation", "flat", "room"
        ));

        RULES.put(Category.PERSONAL_CARE, List.of(
            "salon", "haircut", "parlour", "spa", "beauty",
            "cosmetics", "skin care", "shampoo", "grooming",
            "laundry", "dry clean", "ironing"
        ));

        RULES.put(Category.TRAVEL, List.of(
            "hotel booking", "oyo", "makemytrip", "goibibo",
            "holiday", "vacation", "trip", "tour", "resort",
            "airbnb", "hostel booking", "luggage"
        ));

        RULES.put(Category.SAVINGS, List.of(
            "fd ", "fixed deposit", "mutual fund", "sip",
            "stocks", "shares", "nps", "ppf", "gold",
            "investment", "zerodha", "groww", "upstox", "kuvera",
            "insurance premium", "lic", "savings"
        ));

        RULES.put(Category.INCOME, List.of(
            "salary", "salary credit", "payroll", "freelance",
            "payment received", "transfer received", "refund",
            "cashback", "bonus", "incentive", "dividend",
            "rental income", "interest", "commission"
        ));
    }

    /**
     * Categorises a transaction based on its description.
     *
     * @param description the transaction description text
     * @return the matched Category, or Category.OTHER if no rule matched
     */
    public Category categorise(String description) {
        if (description == null || description.isBlank()) {
            return Category.OTHER;
        }

        String lowerDesc = description.toLowerCase().trim();

        for (Map.Entry<Category, List<String>> rule : RULES.entrySet()) {
            for (String keyword : rule.getValue()) {
                if (lowerDesc.contains(keyword.toLowerCase())) {
                    log.debug("Auto-categorised '{}' as {} (keyword: '{}')",
                              description, rule.getKey(), keyword);
                    return rule.getKey();
                }
            }
        }

        log.debug("No rule matched for '{}' — defaulting to OTHER", description);
        return Category.OTHER;
    }

    /**
     * Returns true if the engine can confidently categorise this description.
     * Used to decide whether to set autoCategorised=true on the transaction.
     */
    public boolean canCategorise(String description) {
        return categorise(description) != Category.OTHER;
    }
}
