import type { LoginState, Priority, TestCase } from "./types";

export const DEFAULT_DEPS: Record<string, string[]> = {
  Navbar: ["Cart", "Wishlist", "Search", "Auth", "Profile", "Orders"],
  Cart: ["Navbar", "Checkout"], Wishlist: ["Navbar"],
  Auth: ["Navbar", "Cart", "Wishlist", "Profile", "Orders"],
  Search: ["Navbar"], Profile: ["Navbar", "Auth"], Orders: ["Navbar", "Auth"], Checkout: ["Cart"],
};
type R = [string, string, string, string, Priority?, LoginState?];
const N = (s: string, t: string, e: string, p?: Priority, l?: LoginState): R => ["Navbar", s, t, e, p, l];
const RAW: R[] = [
  N("Logo", "Hover over logo", "Cursor changes to pointer and hover animation plays", "P3"),
  N("Logo", "Click logo", "Navigates to Home page", "P1"),
  N("T-shirts", "Click T-shirts", "Navigates to filterspage/New%20In", "P1"),
  N("Artist", "Click Artist", "Navigates to Artist page"),
  N("Collections", "Click Collections", "Navigates to Collections page"),
  N("Exclusive", "Click Exclusive", "Navigates to Exclusive page"),
  N("Gift Guide", "Click Gift Guide", "Navigates to Gift Guide page"),
  N("Gift Card", "Click Gift Card", "Navigates to gifting page and scrolls to the gift card section"),
  N("Search", "Click search box", "Filters shown: Graphic Tees, Oversized, Vintage, Gift Ideas, Funny, Magic"),
  N("Search", "Type a keyword", "Keyword-matched products and designers are shown", "P1"),
  N("Wishlist", "Hover wishlist icon", "Icon color changes", "P3"),
  N("Wishlist", "Click wishlist icon", "Navigates to Wishlist page"),
  N("Wishlist", "Add/remove an item", "Counter badge updates correctly", "P1", "Login"),
  N("Cart", "Hover cart icon", "Icon rotate animation plays", "P3"),
  N("Cart", "Click cart icon", "Navigates to Cart page", "P1"),
  N("Cart", "Add/remove an item", "Counter badge updates correctly", "P1"),
  N("Logout", "Click Logout", "Cookies are cleared", "P1", "Login"),
  N("Logout", "After logout", "User is redirected to the login page", "P1", "Login"),
  N("Logout", "Wishlist/Cart actions while logged out", "Actions are blocked", "P1", "Logout"),
  N("Logout", "Press Back after logout", "Profile page does not open", "P1", "Logout"),
  N("Profile/Orders dropdown", "Open dropdown", "Dropdown lists Profile and Orders", "P2", "Login"),
  N("Profile/Orders dropdown", "Click Profile", "Navigates to Profile page", "P2", "Login"),
  N("Profile/Orders dropdown", "Click Orders", "Navigates to Orders page", "P2", "Login"),
  ["Cart", "Line items", "Add an item to cart", "Item, quantity and subtotal are shown correctly", "P1"],
  ["Cart", "Line items", "Remove an item from cart", "Item is removed and totals update"],
  ["Cart", "Checkout button", "Click Proceed to Checkout", "Navigates to Checkout", "P1", "Login"],
  ["Wishlist", "Add", "Add item from product page", "Item appears in the wishlist", "P1", "Login"],
  ["Wishlist", "Remove", "Remove item from wishlist", "Item is removed and counter updates"],
  ["Wishlist", "Move to cart", "Move item to cart", "Item appears in cart and leaves wishlist", "P2", "Login"],
  ["Auth", "Login", "Login with valid credentials", "User is logged in and redirected", "P1", "Logout"],
  ["Auth", "Login", "Login with invalid credentials", "Error message is shown", "P1", "Logout"],
  ["Auth", "Session", "Refresh the page while logged in", "Session persists", "P2", "Login"],
  ["Profile", "Details", "Open Profile page", "User details are displayed", "P2", "Login"],
  ["Profile", "Edit", "Edit and save details", "Changes are saved and shown", "P2", "Login"],
  ["Orders", "List", "Open Orders page", "Past orders are listed", "P2", "Login"],
  ["Orders", "Detail", "Open an order", "Order detail page shows items and status", "P2", "Login"],
  ["Checkout", "Address", "Submit address form with empty required fields", "Validation errors are shown", "P1", "Login"],
  ["Checkout", "Payment", "Select a payment method", "Method is selected and summary updates", "P1", "Login"],
  ["Checkout", "Place order", "Place an order", "Confirmation page is shown", "P1", "Login"],
  ["Search", "Results", "Search with no matching keyword", "Empty-state message is shown", "P3"],
];
export const prefixFor = (c: string) => c.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");

export function seedCases(): TestCase[] {
  const n: Record<string, number> = {};
  const now = "2026-11-01T08:00:00.000Z";
  return RAW.map(([component, subComponent, testCase, expected, priority = "P2", loginState = "Both"]) => {
    const p = prefixFor(component); n[p] = (n[p] ?? 0) + 1;
    return { id: `TC-${p}-${String(n[p]).padStart(3, "0")}`, component, subComponent, testCase, expected, priority, loginState,
      tags: [], active: true, version: 1, lastUpdated: now };
  });
}
