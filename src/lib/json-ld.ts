/**
 * Structured data, written into the page without being able to escape it.
 *
 * ## The bug this exists to close
 *
 * Four pages embed JSON-LD through `dangerouslySetInnerHTML`, and every one of
 * them puts editable text in it: a product's name and description, a
 * collection's name, the shop's own legal name and address. All of that comes
 * from the database and anyone with a Manager login can type it.
 *
 * A name containing `</script>` ends the script element early. The HTML parser
 * does not care that it is inside a JSON string — it is scanning for that byte
 * sequence and nothing else — so everything after it is parsed as markup:
 *
 *     <script type="application/ld+json">{"name":"Shirt </script><img
 *     src=x onerror=alert(1)>"}</script>
 *
 * That is stored cross-site scripting on the storefront, reachable from the
 * admin panel, and it ran. Demonstrated by saving exactly that name through
 * the product form: `alert(1)` fired on the product page and on the category
 * page that listed it.
 *
 * Worth being precise about what went wrong, because the code carried a
 * comment claiming the opposite — that React escapes `<` here. React escapes
 * `<` when it renders *text*, and in the RSC payload it serialises as
 * `<`, which is where that belief came from. `dangerouslySetInnerHTML`
 * is the one place it does not: the string is written to the document byte for
 * byte. That is what the name says.
 *
 * ## The fix
 *
 * `<` becomes `<`, which is the same character to every JSON parser and
 * is not a `<` to an HTML parser. `</script`, `<!--` and every other sequence
 * that could end or reinterpret the element go with it.
 *
 * One function, because the alternative is four copies and the fifth page that
 * gets structured data will be written by someone reading one of them.
 */
export function jsonLd(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
