/**
 * Where this shop is deployed.
 *
 * The only thing left in this file. Everything that was here — the shop name,
 * the phone number, the delivery charges, the menus — is now rows the client
 * edits from the admin panel, because a number compiled into a bundle is a
 * number nobody without a developer can change.
 *
 * The canonical origin stays in code on purpose. It is deployment identity,
 * not a preference: it signs every canonical URL, every Open Graph image and
 * every `@id` in the structured data. A client who "corrected" it in a form
 * would de-index the shop, and would have no way of knowing that is what they
 * had done.
 */
export const siteUrl = "https://silentlifestylebd.com";
