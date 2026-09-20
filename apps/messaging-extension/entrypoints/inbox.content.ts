export default defineContentScript({
  matches: ["https://www.facebook.com/messages/*", "https://www.facebook.com/marketplace/*"],
  world: "ISOLATED",
  main() {
    // No DOM collection or send operation is enabled in the foundation ticket.
  },
});
