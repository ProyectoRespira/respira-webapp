declare module "astro:actions" {
	type Actions = typeof import("/Users/katyarociovazquezmartinez/Documents/GitHub/respira-webapp/frontend/src/actions")["server"];

	export const actions: Actions;
}