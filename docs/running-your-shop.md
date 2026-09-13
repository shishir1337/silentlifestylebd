# Running your shop

Everything in this guide happens in the admin panel at **/admin**. You do not
need a developer for any of it.

Sign in at **/signin** with the email address and password you were given, then
go to **/admin**. If the shop is at `silentlifestylebd.com`, that is
`silentlifestylebd.com/admin`.

**Change your password before you open the shop to customers.** The one you
were handed was sent over chat and should not outlive the setup.

---

## The day's work: Orders

This is the screen you will live in. A cash-on-delivery order is a phone call
before it is a parcel, so every row gives you the customer's number as a link —
tap it and your phone dials.

**The order of events.** An order arrives as *Confirmation pending*. You ring
the customer, and if they confirm it you move it forward:

    Confirmation pending → Confirmed → Packed → Out for delivery → Delivered

Two other endings exist: **Cancelled**, if the order is not going to happen, and
**Returned**, if it comes back. Both put the stock back on the shelf
automatically — you do not need to correct the numbers yourself.

That arrow is the usual path, not a rule. An order can be moved to any status at
any time.

**Moving an order.** The dark button on each row is the usual next step.
**Status** beside it moves the order to *any* status — forwards, backwards, or
straight to the end. If something was marked delivered by mistake, or a customer
rings back about an order you cancelled, put it where it actually is.

Stock keeps up on its own. Cancelling or returning puts the goods back on the
shelf; moving the order out of either takes them again — once, never twice,
however many times you change your mind. If a size was sold in the meantime, the
order records that you are now short rather than refusing the change.

**Cancelling** asks why. There are three common reasons to tap, or write your
own. It is what staff repeat to the customer on the phone, and it stays on the
order.

**View** opens the order beside the list without losing your place: the items,
the address, the amount to collect, and everything that has happened to it. Use
it while you are on the phone.

**Several at once.** Tick the boxes on the left and a bar appears at the top with
the same steps. Confirming thirty orders after a morning of calls is one action.

**"Over a day old"** in red means an order has been waiting more than 24 hours
for its call. Those are the ones that turn into complaints.

**Filters.** Above the list: search by order number, name or phone; narrow by
status, date or area. The web address changes as you filter, so a filtered view
can be bookmarked or sent to someone else.

Every status change is recorded with who made it and when. You can see it on the
order itself.

---

## Products

**Adding one.** Products → *Add product*. The things that must be filled in are
marked with a red star: a name, a product code, a category, a price, and a
picture.

**Pictures.** Drop several photographs onto the picture area at once, or choose
*Upload pictures*. Then tap the star on the one that should be **featured** —
that is the picture customers see on the homepage, in search and in the cart.
The rest become the gallery on the product page, in the order they are shown;
the arrows move them. **Hover** is optional and marks the second picture, the one
that appears when someone on a computer rests their mouse on the product card.

Customers who look through several photographs buy more, and for cash on
delivery it is what stops a parcel being refused at the door. Front, back and a
close-up of the fabric is a good minimum.

**Description.** The toolbar gives you bold, italics and lists. Keep it short: a
sentence about what it is, then anything worth its own line.

**Sizes and stock.** One row per size, with how many you have. A size at zero
shows as sold out and cannot be ordered — it is shown, crossed out, rather than
hidden, so a customer can see the size exists. If you sell something without
sizes, leave the size box empty and use the one row.

Stock goes down by itself as orders come in. You only change these numbers when
new stock arrives. On the Products list you can edit stock without opening the
product.

**Taking something off sale.** Untick *Show on the shop*. It disappears from the
shop but keeps its orders and its history, and you can put it back any time.
Deleting is permanent and is only offered for products nobody has ordered.

---

## Categories and Collections

**Categories** are what a product *is* — Panjabi, Formal Shirt, Watches. Every
product belongs to one. The order here is the order customers see on the
homepage.

**Collections** are groups you put together — "Men", "Women", "Accessories".
Three of them fill themselves and cannot be edited by hand: **New in**,
**Offers** (anything with an old price higher than its price) and
**Bestsellers**.

---

## Content

Five tabs, all of them the words and pictures on the shop.

**Banners** are the large pictures at the top of the homepage. They need exact
sizes — 1920×600 for the wide one and 1000×700 for the phone one — and the panel
will refuse anything else, because a picture of the wrong shape changes the
height of the whole homepage. The *alt* text is the banner's own wording: the
picture carries the words, so this is the only version a search engine or a
screen reader can read. Write what the banner says.

**Pages** are your policies and your story: privacy, terms, returns, about.
Write in sections, each with a heading and paragraphs or bullet points.

Privacy and Terms ask you to confirm before publishing. They are statements to
customers about their data and their money — if the shop starts doing something
different, these have to say so, and anything substantial is worth a lawyer's
five minutes.

**Tiles** are the two panels under the bestsellers on the homepage.

**Size charts** are the tables on the size guide. They are the cheapest returns
prevention you have.

**Menus** are the links at the top of the shop and in the footer. You can only
link to pages that exist — that is deliberate, because a menu link to a page you
renamed is a dead end nobody reports to you.

---

## Media

Every picture on the shop. Uploads go straight to the image service, so they stay
fast on a phone and cost you nothing in server time.

Give each picture a short description of what it shows. That is what a customer
using a screen reader hears, and what Google reads.

A picture that is used somewhere cannot be deleted — the panel tells you where
it is used. Take it off that product first.

---

## Settings *(owner only)*

Three tabs. **Your shop** is your name and description. **How customers reach
you** is your phone, email and address — the phone number is also the WhatsApp
button. **Delivery and returns** is what customers are charged.

Changing a delivery charge changes the price of every order placed afterwards.
Orders already placed keep the charge they were given.

One save button covers all three tabs; it tells you how many changes are waiting
and whether any are on a tab you cannot see.

---

## Staff *(owner only)*

**Giving someone access.** Ask them to sign up on the shop at **/signup** first,
with the email address you are going to type. Then add that address here and
choose what they can do:

| | |
|---|---|
| **Staff** | Orders only. Cannot change prices, products or settings. |
| **Manager** | Orders, products, categories and everything under Content. |
| **Owner** | Everything, including settings and who else gets in. |

There is no invitation email on purpose. A link that hands out admin access is a
link that can be forwarded.

**Taking it away.** *Remove access* takes the role, not the account — they may be
a customer too, and their orders are not yours to delete. They are locked out of
the panel on their next click.

You cannot change your own role, and there is always at least one owner. If every
owner is somehow locked out, whoever hosts the site can restore access from the
server.

**Activity** shows every change to settings and staff access, with who made it.

---

## Things worth knowing

**Changes appear on the shop within a few seconds.** The shop is served from a
cache so it stays fast; saving in the panel clears the part that changed. If
something looks stale, reload once.

**The shop keeps working if the panel breaks.** They are the same application but
the shop is served from its cache, so a page that fails here does not stop
customers ordering.

**Nothing is charged online.** Every order is cash on delivery. No card details
exist anywhere in this system.

**Guests can order without an account.** Most will. An account only lets someone
keep their addresses and see their past orders.

---

## When something is wrong

**"This page could not load"** in the panel usually means the database is
unreachable. Try again; if it keeps happening, quote the reference on the screen
to whoever hosts the site.

**A product page shows an error on the shop.** Almost always a product with no
main picture. The panel will not let you save one now, but an older one may
exist — open it and add a picture.

**An order will not move.** If somebody else moved it a moment ago, the panel
refuses rather than overwriting them. Reload and look at where it actually is.

**You cannot see Settings, Staff or Activity.** Those are owner-only. Ask an
owner.
