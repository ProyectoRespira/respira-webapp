declare module "astro:actions" {
	type Actions = typeof import("/home/claraberendsen/respira-webapp/frontend/src/actions")["server"];

	export const actions: Actions;
}