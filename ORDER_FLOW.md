# Orders and payment proof

Run `npm start` to serve both the site and the order API. Static hosting alone cannot save payment proof.

On the published `github.io` site, the static fallback saves the image in IndexedDB on the customer's browser and prepares WhatsApp without an API request. The receipt and history have a download button so the customer can attach the image manually in WhatsApp. This mode does not upload the proof to a server, send it automatically, or produce a publicly accessible proof link. Clearing browser data removes these local images. Server-backed proof links remain available when running the Node server.

`POST /api/orders` validates the customer phone, products and quantities, and saves an image (JPG/PNG/WebP, maximum 5 MiB) with the order. Orders use the server timestamp; WhatsApp displays date and 24-hour time in `Africa/Tripoli`.

The order message contains only the requested customer, phone, products, quantities, date and time. A separate receipt button opens WhatsApp with the payment proof link. The customer still presses Send in WhatsApp. No image is automatically attached and no payment is automatically verified.

Set `ORDER_STORAGE_DIR` to a persistent private directory on the production server. The default is `.orders/`, which is ignored by Git and blocked from static serving. Back this directory up as needed. Receipts are accessible by an unguessable UUID link; anyone holding that link can view the image. There is no public order index. Use a public HTTPS origin for production so the shop can open the link from another device; localhost links work only on this computer.

Failed saves keep the cart and selected image in the current page. Saved orders and proof-sharing links also remain in the customer order history on the same browser.

Run `npm test` for the order API and WhatsApp message checks.
