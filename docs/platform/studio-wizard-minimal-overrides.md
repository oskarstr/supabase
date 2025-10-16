# Studio Wizard Platform Overrides (Minimal Upstream Footprint)

## Why the fa1d18b delta felt too heavy
The reverted commit `fa1d18b` placed all of the platform-local runtime UX directly inside `apps/studio/pages/new/[slug].tsx`, introducing ~100 lines of bespoke JSX and state to the upstream wizard. Besides creating merge friction, it broke our goal of **data-driven overrides** that disappear when the platform content keys are absent.

## What tools we already have
- **Custom content loader** – `useCustomContent` can synchronously read values from `apps/studio/hooks/custom-content/custom-content.json`, automatically camel-casing keys such as `project_creation:deployment_targets` into `projectCreationDeploymentTargets`. The hook only needs a list of keys to return typed values, so wiring extra data is zero-cost for upstream when the keys are missing (they resolve to `null`).【F:apps/studio/hooks/custom-content/useCustomContent.ts†L1-L44】
- **Existing content for deployment UX** – Our custom content bundle already ships the deployment target list and local runtime services metadata, exactly matching the data that the large patch tried to bake into the wizard.【F:apps/studio/hooks/custom-content/custom-content.json†L59-L85】
- **Mutation surface** – The project creation mutation already understands a `local_runtime.exclude_services` payload so the UI only needs to pass the list of unchecked services; the API contract is ready.【F:apps/studio/data/projects/project-create-mutation.ts†L25-L83】

## Proposed extension architecture
1. **Tiny upstream seam** – Add a single optional component slot to `apps/studio/pages/new/[slug].tsx`, e.g. `PlatformProjectCreateExtensions`. The upstream implementation exports `null`, and the platform bundle re-exports a populated version from `apps/studio/components/platform/ProjectCreation/PlatformProjectCreateExtensions.tsx`. Upstream diff stays <10 LOC and is feature-flag free.
2. **Platform-only component** – Inside the platform component we:
   - Read the deployment target list and local services via `useCustomContent(['project_creation:deployment_targets', 'project_creation:local_runtime_services'])`.
   - Provide fallback data (mirroring `FALLBACK_LOCAL_RUNTIME_SERVICES`) so the UI still works if the content endpoint is empty while keeping the fallback out of upstream files.
   - Render the deployment toggle + local services table using isolated JSX that lives entirely in the platform folder. The component receives the form methods through props (e.g. `form`, `setValue`) so it can manipulate RHF state without touching upstream form logic.
3. **Data-driven defaults** – When the component mounts it:
   - Checks if `deploymentTarget` is undefined and nudges it to the first entry from the content list (remote-first by default).
   - Seeds the `localServices` array with all content entries whose `defaultEnabled` is true. Because it runs in the platform bundle only, upstream builds never see the side effects.
4. **Minimal wizard edits** – The wizard simply renders `<PlatformProjectCreateExtensions form={form} watch={watch} setValue={setValue} />` next to the advanced configuration panel. No extra state hooks, no new constants, and upstream continues to compile because the default export returns `null`.
5. **Future toggles** – The same slot can later render other data-driven fragments (docs callouts, partner CTAs) without touching upstream wizard files—just add new content keys and extend the platform component.

## Optional feature-flag alignment
If we need runtime enable/disable without redeploying custom content, wrap the platform component with the existing ConfigCat plumbing (`packages/common/feature-flags.tsx`). Because the seam is one component, the flag check lives in the platform file only.

## Next steps
- [ ] Introduce the `PlatformProjectCreateExtensions` seam in the wizard.
- [ ] Build the platform component that consumes the custom content data and bridges RHF state.
- [ ] Move fallback service metadata out of `[slug].tsx` into the platform component (or custom content seed) so upstream never sees the list.
- [ ] Document the custom content contract (keys, shape) near the platform component to keep future tweaks consistent.
